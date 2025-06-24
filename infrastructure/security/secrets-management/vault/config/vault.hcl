// Vault server configuration
ui = true
disable_mlock = true

// Storage backend - for production use Consul or integrated storage
storage "file" {
  path = "/vault/file"
}

// For production with Consul
// storage "consul" {
//   address = "consul:8500"
//   path    = "vault/"
// }

// For production with integrated storage (Raft)
// storage "raft" {
//   path    = "/vault/data"
//   node_id = "node1"
// }

// HTTP listener
listener "tcp" {
  address       = "0.0.0.0:8200"
  tls_disable   = "true"  // Enable TLS in production
  
  // For production with TLS
  // tls_cert_file = "/vault/config/vault.crt"
  // tls_key_file  = "/vault/config/vault.key"
}

// API address
api_addr = "http://0.0.0.0:8200"
cluster_addr = "https://0.0.0.0:8201"

// Telemetry
telemetry {
  prometheus_retention_time = "30s"
  disable_hostname = true
}

// Audit logging
// audit {
//   enabled = true
//   
//   sink "file" {
//     type = "file"
//     path = "/vault/logs/audit.log"
//     mode = "0600"
//     format = "json"
//   }
// }

// Default lease duration
default_lease_ttl = "768h"
max_lease_ttl = "8760h"

// Enable response wrapping by default
enable_response_header_hostname = true
enable_response_header_raft_node_id = true

// Performance tuning
cache_size = 131072

// Log level
log_level = "info"