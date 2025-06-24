#!/bin/bash

# Performance Testing Script for E-commerce Platform
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${BASE_URL:-http://localhost:8000}"
TEST_TYPE="${1:-load}"
REPORT_DIR="./reports/$(date +%Y%m%d_%H%M%S)"
K6_CLOUD_TOKEN="${K6_CLOUD_TOKEN:-}"

echo -e "${GREEN}🚀 E-commerce Performance Testing Suite${NC}"
echo -e "${GREEN}=====================================

${NC}"

# Create report directory
mkdir -p "$REPORT_DIR"

# Function to check if services are healthy
check_services() {
    echo -e "${YELLOW}Checking service health...${NC}"
    
    services=("$BASE_URL/health" "$BASE_URL/api/products/health" "$BASE_URL/api/users/health")
    
    for service in "${services[@]}"; do
        if curl -f -s "$service" > /dev/null; then
            echo -e "${GREEN}✓ $service is healthy${NC}"
        else
            echo -e "${RED}✗ $service is not responding${NC}"
            exit 1
        fi
    done
    
    echo ""
}

# Function to run K6 tests
run_k6_test() {
    local test_name=$1
    local script_path=$2
    
    echo -e "${YELLOW}Running K6 $test_name test...${NC}"
    
    if command -v k6 &> /dev/null; then
        k6 run \
            --out json="$REPORT_DIR/k6_${test_name}_results.json" \
            --out csv="$REPORT_DIR/k6_${test_name}_results.csv" \
            --summary-export="$REPORT_DIR/k6_${test_name}_summary.json" \
            -e BASE_URL="$BASE_URL" \
            "$script_path"
        
        echo -e "${GREEN}✓ K6 $test_name test completed${NC}"
    else
        echo -e "${RED}K6 is not installed. Please install it first.${NC}"
        echo "Visit: https://k6.io/docs/getting-started/installation/"
    fi
    
    echo ""
}

# Function to run Artillery tests
run_artillery_test() {
    local test_name=$1
    local config_path=$2
    
    echo -e "${YELLOW}Running Artillery $test_name test...${NC}"
    
    if command -v artillery &> /dev/null; then
        artillery run \
            --output "$REPORT_DIR/artillery_${test_name}_results.json" \
            --target "$BASE_URL" \
            "$config_path"
        
        # Generate HTML report
        artillery report \
            "$REPORT_DIR/artillery_${test_name}_results.json" \
            --output "$REPORT_DIR/artillery_${test_name}_report.html"
        
        echo -e "${GREEN}✓ Artillery $test_name test completed${NC}"
    else
        echo -e "${RED}Artillery is not installed. Install with: npm install -g artillery${NC}"
    fi
    
    echo ""
}

# Function to run Locust tests
run_locust_test() {
    local test_name=$1
    local locust_file=$2
    local users=$3
    local spawn_rate=$4
    local run_time=$5
    
    echo -e "${YELLOW}Running Locust $test_name test...${NC}"
    
    if command -v locust &> /dev/null; then
        locust \
            --headless \
            --users "$users" \
            --spawn-rate "$spawn_rate" \
            --run-time "$run_time" \
            --host "$BASE_URL" \
            --html "$REPORT_DIR/locust_${test_name}_report.html" \
            --csv "$REPORT_DIR/locust_${test_name}" \
            -f "$locust_file"
        
        echo -e "${GREEN}✓ Locust $test_name test completed${NC}"
    else
        echo -e "${RED}Locust is not installed. Install with: pip install locust${NC}"
    fi
    
    echo ""
}

# Function to analyze results
analyze_results() {
    echo -e "${YELLOW}Analyzing test results...${NC}"
    
    # Create summary report
    cat > "$REPORT_DIR/summary.md" << EOF
# Performance Test Summary

**Date**: $(date)
**Base URL**: $BASE_URL
**Test Type**: $TEST_TYPE

## Results

### K6 Tests
EOF
    
    # Parse K6 results
    if [ -f "$REPORT_DIR/k6_load_summary.json" ]; then
        python3 -c "
import json
with open('$REPORT_DIR/k6_load_summary.json') as f:
    data = json.load(f)
    metrics = data.get('metrics', {})
    
    print('- **HTTP Request Duration (95th percentile)**: {:.2f}ms'.format(
        metrics.get('http_req_duration', {}).get('p(95)', 0)
    ))
    print('- **HTTP Request Duration (99th percentile)**: {:.2f}ms'.format(
        metrics.get('http_req_duration', {}).get('p(99)', 0)
    ))
    print('- **Request Failure Rate**: {:.2%}'.format(
        metrics.get('http_req_failed', {}).get('rate', 0)
    ))
    print('- **Requests per Second**: {:.2f}'.format(
        metrics.get('http_reqs', {}).get('rate', 0)
    ))
" >> "$REPORT_DIR/summary.md"
    fi
    
    echo -e "${GREEN}✓ Analysis complete. Reports saved to: $REPORT_DIR${NC}"
}

# Main execution
check_services

case "$TEST_TYPE" in
    "smoke")
        echo -e "${YELLOW}Running smoke tests...${NC}"
        run_k6_test "smoke" "./tests/performance/k6/load-test.js"
        ;;
    
    "load")
        echo -e "${YELLOW}Running load tests...${NC}"
        run_k6_test "load" "./tests/performance/k6/load-test.js"
        run_artillery_test "load" "./tests/performance/artillery/load-test.yml"
        ;;
    
    "stress")
        echo -e "${YELLOW}Running stress tests...${NC}"
        run_k6_test "stress" "./tests/performance/k6/load-test.js"
        run_locust_test "stress" "./tests/performance/locust/locustfile.py" 500 10 "30m"
        ;;
    
    "spike")
        echo -e "${YELLOW}Running spike tests...${NC}"
        run_k6_test "spike" "./tests/performance/k6/load-test.js"
        ;;
    
    "soak")
        echo -e "${YELLOW}Running soak tests (this will take several hours)...${NC}"
        run_locust_test "soak" "./tests/performance/locust/locustfile.py" 100 5 "4h"
        ;;
    
    "all")
        echo -e "${YELLOW}Running all test types...${NC}"
        run_k6_test "smoke" "./tests/performance/k6/load-test.js"
        run_k6_test "load" "./tests/performance/k6/load-test.js"
        run_k6_test "stress" "./tests/performance/k6/load-test.js"
        run_k6_test "spike" "./tests/performance/k6/load-test.js"
        ;;
    
    *)
        echo -e "${RED}Unknown test type: $TEST_TYPE${NC}"
        echo "Usage: $0 [smoke|load|stress|spike|soak|all]"
        exit 1
        ;;
esac

analyze_results

echo -e "${GREEN}🎉 Performance testing completed!${NC}"
echo -e "${GREEN}📊 Reports available at: $REPORT_DIR${NC}"

# Open HTML report if available
if [ -f "$REPORT_DIR/k6_load_report.html" ]; then
    echo -e "${YELLOW}Opening test report...${NC}"
    open "$REPORT_DIR/k6_load_report.html" 2>/dev/null || xdg-open "$REPORT_DIR/k6_load_report.html" 2>/dev/null || echo "Please open $REPORT_DIR/k6_load_report.html manually"
fi