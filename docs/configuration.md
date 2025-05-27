# Configuration

In order to operate the service successfully, a number of configurations are required.
This affects security settings, external services and scheduling jobs used by
Kippenstummel API. The configuration must be available at runtime and can be done either
classically via environment variables or via environment files. Environment files are
essentially text files that are located in the current working directory of the service
and contain the configuration as key-value pairs.

---

**NOTE**

The configuration of the web client is based on the technical possibilities of
[Nest.js](https://nextjs.com/), see
[Nest.js Configuration](https://docs.nestjs.com/techniques/configuration).
In order to keep the configuration of the service as simple and straightforward as possible,
Kippenstummel API abstracts the configuration process and only uses a part of what is technically
possible. Nevertheless, the technical principles of the Next.js still apply and are mentioned
here for the sake of completeness.

---

## Configuration Options

### Datasource Configuration

The following configuration options are available:

| Environment Variable | Description                      | Required |
| -------------------- | -------------------------------- | -------- |
| MONGO_URI            | The URI of the MongoDB database. | true     |
| REDIS_URI            | The URI of the Redis database.   | true     |

### Server Configuration

The following configuration options are available:

| Environment Variable | Description                                          | Required |
| -------------------- | ---------------------------------------------------- | -------- |
| PORT                 | The port the service is running on. Default is 8080. | true     |

### Security Configuration

The following configuration options are available:

| Environment Variable | Description                                                                                                              | Required |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------ | -------- |
| OAUTH2_KEY_PATH      | Path to the public key of the OAuth2 authorization server.                                                               | true     |
| POW_DIFFICULTY       | The difficulty of the PoW algorithm used for authentication. The difficulty is a number between 1 and 256. Default is 20 | false    |
| POW_EXPIRES_IN       | The number of seconds until the PoW challenge expires. Default is 5 minutes.                                             | false    |
| CAPTCHA_EXPIRES_IN   | The number of seconds until the Captcha challenge expires. Default is 5 minutes.                                         | false    |
| IDENT_SECRET         | The secret used to sign the ident tokens.                                                                                | true     |
| IDENT_EXPIRES_IN     | The number of seconds until the ident token expires. Default is 7 days.                                                  | false    |
