const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

/**
 * Secrets Manager for integrating with Vault
 */
class SecretsManager {
  constructor(options = {}) {
    this.vaultAddr = options.vaultAddr || process.env.VAULT_ADDR || 'http://vault:8200';
    this.roleId = options.roleId || process.env.VAULT_ROLE_ID;
    this.secretId = options.secretId || process.env.VAULT_SECRET_ID;
    this.token = null;
    this.tokenExpiry = null;
    this.cache = new Map();
    this.cacheExpiry = options.cacheExpiry || 300000; // 5 minutes
  }

  /**
   * Initialize the secrets manager
   */
  async init() {
    try {
      // Try to load credentials from file if not in env
      if (!this.roleId || !this.secretId) {
        await this.loadCredentialsFromFile();
      }

      // Authenticate with Vault
      await this.authenticate();

      // Set up token renewal
      this.scheduleTokenRenewal();

      console.log('✅ Secrets Manager initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Secrets Manager:', error.message);
      // Fall back to environment variables
      this.fallbackToEnv();
    }
  }

  /**
   * Load Vault credentials from file
   */
  async loadCredentialsFromFile() {
    try {
      const credPath = process.env.VAULT_CREDS_PATH || '/vault/file/app-credentials.json';
      const data = await fs.readFile(credPath, 'utf8');
      const creds = JSON.parse(data);
      this.roleId = creds.role_id;
      this.secretId = creds.secret_id;
      this.vaultAddr = creds.vault_addr || this.vaultAddr;
    } catch (error) {
      console.warn('Could not load Vault credentials from file:', error.message);
    }
  }

  /**
   * Authenticate with Vault using AppRole
   */
  async authenticate() {
    try {
      const response = await axios.post(
        `${this.vaultAddr}/v1/auth/approle/login`,
        {
          role_id: this.roleId,
          secret_id: this.secretId
        }
      );

      this.token = response.data.auth.client_token;
      this.tokenExpiry = Date.now() + (response.data.auth.lease_duration * 1000);
      
      // Set default auth header
      axios.defaults.headers.common['X-Vault-Token'] = this.token;
    } catch (error) {
      throw new Error(`Vault authentication failed: ${error.message}`);
    }
  }

  /**
   * Schedule token renewal before expiry
   */
  scheduleTokenRenewal() {
    if (!this.tokenExpiry) return;

    const renewalTime = this.tokenExpiry - Date.now() - 60000; // Renew 1 minute before expiry
    
    setTimeout(async () => {
      try {
        await this.renewToken();
        this.scheduleTokenRenewal();
      } catch (error) {
        console.error('Failed to renew Vault token:', error.message);
        // Try to re-authenticate
        await this.authenticate();
        this.scheduleTokenRenewal();
      }
    }, Math.max(renewalTime, 10000)); // Minimum 10 seconds
  }

  /**
   * Renew the current token
   */
  async renewToken() {
    const response = await axios.post(
      `${this.vaultAddr}/v1/auth/token/renew-self`,
      {},
      {
        headers: { 'X-Vault-Token': this.token }
      }
    );

    this.tokenExpiry = Date.now() + (response.data.auth.lease_duration * 1000);
  }

  /**
   * Get a secret from Vault
   */
  async getSecret(path, key = null) {
    const cacheKey = `${path}:${key || ''}`;
    
    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return cached.value;
    }

    try {
      // Ensure we have a valid token
      if (!this.token || Date.now() >= this.tokenExpiry) {
        await this.authenticate();
      }

      const response = await axios.get(
        `${this.vaultAddr}/v1/${path}`,
        {
          headers: { 'X-Vault-Token': this.token }
        }
      );

      const data = response.data.data.data || response.data.data;
      const value = key ? data[key] : data;

      // Cache the result
      this.cache.set(cacheKey, {
        value,
        expiry: Date.now() + this.cacheExpiry
      });

      return value;
    } catch (error) {
      console.error(`Failed to get secret from ${path}:`, error.message);
      // Fall back to environment variable
      if (key) {
        return process.env[key.toUpperCase()];
      }
      return null;
    }
  }

  /**
   * Get database credentials with automatic rotation
   */
  async getDatabaseCredentials(role) {
    try {
      const response = await axios.get(
        `${this.vaultAddr}/v1/database/creds/${role}`,
        {
          headers: { 'X-Vault-Token': this.token }
        }
      );

      return {
        username: response.data.data.username,
        password: response.data.data.password,
        leaseId: response.data.lease_id,
        leaseDuration: response.data.lease_duration
      };
    } catch (error) {
      console.error(`Failed to get database credentials for ${role}:`, error.message);
      // Fall back to static credentials
      return this.getStaticDatabaseCredentials(role);
    }
  }

  /**
   * Encrypt data using Vault's transit engine
   */
  async encrypt(plaintext) {
    try {
      const response = await axios.post(
        `${this.vaultAddr}/v1/transit/encrypt/app`,
        {
          plaintext: Buffer.from(plaintext).toString('base64')
        },
        {
          headers: { 'X-Vault-Token': this.token }
        }
      );

      return response.data.data.ciphertext;
    } catch (error) {
      console.error('Failed to encrypt data:', error.message);
      // Fall back to local encryption
      return this.localEncrypt(plaintext);
    }
  }

  /**
   * Decrypt data using Vault's transit engine
   */
  async decrypt(ciphertext) {
    try {
      const response = await axios.post(
        `${this.vaultAddr}/v1/transit/decrypt/app`,
        { ciphertext },
        {
          headers: { 'X-Vault-Token': this.token }
        }
      );

      return Buffer.from(response.data.data.plaintext, 'base64').toString();
    } catch (error) {
      console.error('Failed to decrypt data:', error.message);
      // Fall back to local decryption
      return this.localDecrypt(ciphertext);
    }
  }

  /**
   * Fall back to environment variables when Vault is unavailable
   */
  fallbackToEnv() {
    console.warn('⚠️  Falling back to environment variables for secrets');
    this.getSecret = async (path, key) => {
      if (key) {
        return process.env[key.toUpperCase()];
      }
      // Return all env vars that match the path pattern
      const prefix = path.replace(/\//g, '_').toUpperCase();
      const result = {};
      for (const [envKey, value] of Object.entries(process.env)) {
        if (envKey.startsWith(prefix)) {
          const secretKey = envKey.replace(prefix + '_', '').toLowerCase();
          result[secretKey] = value;
        }
      }
      return result;
    };
  }

  /**
   * Get static database credentials (fallback)
   */
  getStaticDatabaseCredentials(role) {
    const creds = {
      'app-read': {
        username: process.env.DB_READ_USER || 'app_read',
        password: process.env.DB_READ_PASS || 'readpass'
      },
      'app-write': {
        username: process.env.DB_WRITE_USER || 'app_write',
        password: process.env.DB_WRITE_PASS || 'writepass'
      }
    };

    return creds[role] || creds['app-read'];
  }

  /**
   * Local encryption fallback using crypto
   */
  localEncrypt(plaintext) {
    const crypto = require('crypto');
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(process.env.ENCRYPTION_KEY || 'default-encryption-key-32-chars!', 'utf8');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return `local:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Local decryption fallback using crypto
   */
  localDecrypt(ciphertext) {
    if (!ciphertext.startsWith('local:')) {
      throw new Error('Invalid ciphertext format');
    }

    const crypto = require('crypto');
    const parts = ciphertext.split(':');
    const iv = Buffer.from(parts[1], 'hex');
    const authTag = Buffer.from(parts[2], 'hex');
    const encrypted = parts[3];
    
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(process.env.ENCRYPTION_KEY || 'default-encryption-key-32-chars!', 'utf8');
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }
}

// Singleton instance
let secretsManager;

/**
 * Get the secrets manager instance
 */
async function getSecretsManager() {
  if (!secretsManager) {
    secretsManager = new SecretsManager();
    await secretsManager.init();
  }
  return secretsManager;
}

module.exports = {
  SecretsManager,
  getSecretsManager
};