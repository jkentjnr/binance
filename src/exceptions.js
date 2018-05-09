class ValidationError extends Error {
    constructor(message, e) {
      super(message);
      this.name = 'ValidationError';
      this.innerException = e;
    }
}

export default {
	ValidationError,
};	