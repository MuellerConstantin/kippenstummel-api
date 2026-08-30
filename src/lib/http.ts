const MAX_BODY_LENGTH = 500;

/*
 * The body is a stream that can only be read once and is gone with the Response
 * object, so it has to be materialised before the caller throws it away.
 */
export async function describeResponseFailure(
  response: Response,
): Promise<string> {
  const body = await response.text().catch(() => '<unreadable body>');

  return `${response.status} ${response.statusText}: ${body.slice(0, MAX_BODY_LENGTH)}`;
}
