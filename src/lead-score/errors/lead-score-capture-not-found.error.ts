export class LeadScoreCaptureNotFoundError extends Error {
  constructor(
    message: string,
    readonly identifiers: {
      captureId?: string;
      leadRegistrationRequestId?: string;
    },
  ) {
    super(message);
    this.name = LeadScoreCaptureNotFoundError.name;
  }
}
