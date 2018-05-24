class ValidationError extends Error {
    constructor(message, e) {
      super(message);
      this.name = 'ValidationError';
      this.innerException = e;
    }
}

class ConfigurationError extends Error {
  constructor(message, e) {
    super(message);
    this.name = 'ConfigurationError';
    this.innerException = e;
  }
}

export default {
  ValidationError,
  ConfigurationError,
};	