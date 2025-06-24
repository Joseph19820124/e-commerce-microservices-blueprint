-- Circuit Breaker Plugin for Kong
-- Implements circuit breaker pattern for fault tolerance

local kong = kong
local ngx = ngx
local timer_at = ngx.timer.at

local CircuitBreakerHandler = {
    VERSION = "1.0.0",
    PRIORITY = 1000,
}

-- Circuit states
local CLOSED = 0
local OPEN = 1
local HALF_OPEN = 2

-- Default configuration
local defaults = {
    failure_threshold = 5,
    success_threshold = 2,
    timeout = 30,
    half_open_timeout = 10,
    window_size = 60,
    error_codes = {500, 502, 503, 504}
}

-- Storage for circuit states
local circuits = {}

-- Helper function to check if response code is an error
local function is_error_code(status, error_codes)
    for _, code in ipairs(error_codes) do
        if status == code then
            return true
        end
    end
    return false
end

-- Get or create circuit for a service
local function get_circuit(service_id, config)
    if not circuits[service_id] then
        circuits[service_id] = {
            state = CLOSED,
            failure_count = 0,
            success_count = 0,
            last_failure_time = 0,
            last_state_change = ngx.time(),
            config = config
        }
    end
    return circuits[service_id]
end

-- Check if circuit should transition from OPEN to HALF_OPEN
local function check_timeout(circuit)
    local now = ngx.time()
    if circuit.state == OPEN then
        local timeout = circuit.config.timeout or defaults.timeout
        if now - circuit.last_state_change >= timeout then
            circuit.state = HALF_OPEN
            circuit.last_state_change = now
            circuit.success_count = 0
            kong.log.info("Circuit breaker transitioning to HALF_OPEN for service")
        end
    end
end

-- Handle successful request
local function on_success(circuit)
    local now = ngx.time()
    
    if circuit.state == HALF_OPEN then
        circuit.success_count = circuit.success_count + 1
        local threshold = circuit.config.success_threshold or defaults.success_threshold
        
        if circuit.success_count >= threshold then
            circuit.state = CLOSED
            circuit.failure_count = 0
            circuit.success_count = 0
            circuit.last_state_change = now
            kong.log.info("Circuit breaker CLOSED after successful requests")
        end
    elseif circuit.state == CLOSED then
        -- Reset failure count on success in closed state
        circuit.failure_count = 0
    end
end

-- Handle failed request
local function on_failure(circuit)
    local now = ngx.time()
    
    if circuit.state == CLOSED or circuit.state == HALF_OPEN then
        circuit.failure_count = circuit.failure_count + 1
        circuit.last_failure_time = now
        
        local threshold = circuit.config.failure_threshold or defaults.failure_threshold
        
        if circuit.failure_count >= threshold then
            circuit.state = OPEN
            circuit.last_state_change = now
            circuit.failure_count = 0
            kong.log.err("Circuit breaker OPEN due to excessive failures")
        end
    end
    
    -- If in HALF_OPEN state, immediately go back to OPEN
    if circuit.state == HALF_OPEN then
        circuit.state = OPEN
        circuit.last_state_change = now
        circuit.success_count = 0
        kong.log.warn("Circuit breaker back to OPEN from HALF_OPEN due to failure")
    end
end

function CircuitBreakerHandler:access(config)
    local service = kong.router.get_service()
    if not service then
        return
    end
    
    local circuit = get_circuit(service.id, config)
    check_timeout(circuit)
    
    -- Block request if circuit is OPEN
    if circuit.state == OPEN then
        kong.log.err("Circuit breaker is OPEN, blocking request to service: ", service.name)
        return kong.response.exit(503, {
            message = "Service temporarily unavailable",
            error = "circuit_breaker_open"
        })
    end
    
    -- Allow request but track it
    kong.ctx.plugin.circuit = circuit
    kong.ctx.plugin.service_id = service.id
end

function CircuitBreakerHandler:header_filter(config)
    local circuit = kong.ctx.plugin.circuit
    if not circuit then
        return
    end
    
    local status = kong.response.get_status()
    local error_codes = config.error_codes or defaults.error_codes
    
    if is_error_code(status, error_codes) then
        on_failure(circuit)
    else
        on_success(circuit)
    end
end

-- Health check endpoint for circuit status
function CircuitBreakerHandler:health_check()
    local status = {}
    for service_id, circuit in pairs(circuits) do
        status[service_id] = {
            state = circuit.state == CLOSED and "closed" or (circuit.state == OPEN and "open" or "half_open"),
            failure_count = circuit.failure_count,
            success_count = circuit.success_count,
            last_failure_time = circuit.last_failure_time,
            last_state_change = circuit.last_state_change
        }
    end
    return status
end

return CircuitBreakerHandler