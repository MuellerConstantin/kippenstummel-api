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

| Environment Variable | Description                                                                                                                                                                                                                                                                                                                                                                                                        | Required |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| NODE_ENV             | The environment the service runs in. One of `development`, `production`, `staging` or `test`. Also selects which environment files are read.                                                                                                                                                                                                                                                                       | true     |
| PORT                 | The port the service is running on. Default is 8080.                                                                                                                                                                                                                                                                                                                                                               | true     |
| CONFIG_DIR           | The directory environment files are read from, in addition to the working directory. Default is `./config`.                                                                                                                                                                                                                                                                                                        | false    |
| TMP_DIR              | The directory uploaded files are buffered in while an import is being processed.                                                                                                                                                                                                                                                                                                                                   | true     |
| TRUST_PROXY          | Comma separated list of proxy addresses to trust when deriving the client address from the X-Forwarded-For header. Accepts subnets such as `172.18.0.0/16` and the shorthands `loopback`, `linklocal` and `uniquelocal`. For a service behind a proxy on a docker network, `loopback, linklocal, uniquelocal` is the usual value. Unset means the header is ignored and the address of the immediate peer is used. | false    |

### Security Configuration

The following configuration options are available:

| Environment Variable | Description                                                                           | Required |
| -------------------- | ------------------------------------------------------------------------------------- | -------- |
| JWT_SECRET           | Symmetric key used to verify JWT tokens used for administrative authentication        | true     |
| CAPTCHA_EXPIRES_IN   | The number of seconds until the Captcha challenge expires. Default is 5 minutes.      | false    |
| IDENT_SECRET         | The secret used to sign the ident tokens.                                             | true     |
| IDENT_EXPIRES_IN     | The number of seconds until the ident token expires. Default is 7 days.               | false    |
| TRANSFER_EXPIRES_IN  | The number of seconds until an identity transfer token expires. Default is 5 minutes. | false    |

### Logging Configuration

Unlike the options above, these are read from the process environment directly
rather than through the validated configuration, because the logger is set up
before the configuration is loaded. They are therefore not validated at startup
and cannot be supplied through an environment file.

The following configuration options are available:

| Environment Variable | Description                                                                                                                      | Required |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------- | -------- |
| LOG_LEVEL            | The lowest level that is still written. One of `error`, `warn`, `info`, `debug` or `verbose`. Default is `info`.                 | false    |
| LOG_DIR              | The directory log files are written to. Files are rotated daily, capped at 20 MB each and kept for 14 days. Default is `./logs`. | false    |
