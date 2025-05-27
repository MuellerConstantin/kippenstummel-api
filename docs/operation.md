# Operation

The Kippenstummel API service is generally operated on-premise. This means that both the actual application
server and required third-party services must be installed and operated in their own environment, either
standalone or containerized.

## System Environment

The application uses a number of third-party services and also requires them to function correctly. It is therefore
necessary to make these services available and to make them known accordingly. The following third-party services
are required, the exact versions are Kippenstummel API release dependent:

**[MongoDB](https://www.mongodb.com/)**

MongoDB is a database that is used for the storage of application data. It is used as primary storage for
business data and event sourcing.

**[Redis](https://redis.io/)**

Redis is a key-value store that is used for the storage of temporary application state. This includes
the tokens used for authentication and authorization as well as the state of the application itself.

**[Keycloak](https://www.keycloak.org/)**

Keycloak is an identity and access management solution that is used for user authentication and authorization.
Technically, any authority capable of issuing OAuth2 JWT tokens can be used. However, the application is
specifically tuned for Keycloak. Other OAuth2 authorization servers are not officially supported.

## Deployment

As mentioned above, the Kippenstummel API service is generally operated on-premise. For error-free operation, the
application must also be configured accordingly. Third-party services must be made known and settings made.
For a detailed overview of the configuration, see [here](./configuration.md). The application can run
either as system software (standalone) or in a container. Depending on this, either Docker or a Node.js
runtime environment is required.

### Container

The application can also be run in a container using the provided or self-built Docker image. This does not
require a Node.js installation on the target system, but an installation of the Docker Engine. This is also
the recommended deployment method.

Even with container deployment, the application still has to be configured. This is basically the same as for
standalone operation. When using a configuration file, however, it must be ensured that this is made accessible
to the container, for example by mounting a volume. Alternatively, the container can be configured using
system environment variables. For configuration details see [configuration](./configuration.md).

The release in the form of a Docker image can be started as follows:

```shell
docker run -d -p 8080:8080 -v <CONFIG_PATH>:/usr/local/etc/kippenstummel/api -v <LOGS_PATH>:/usr/local/var/log/kippenstummel/api kippenstummel/api:<VERSION>
```

#### Build image

Should it be necessary in the development phase or for other reasons to build the Docker image directly
from the source code, this is also possible. The image is built in multi-stage operation on a Docker basis.
The provided Dockerfile can be used to build:

```shell
docker build -t kippenstummel/api:<VERSION> .
```

### Standalone

Because the application is written in TypeScript and based on the Node.js runtime, a Node.js runtime
environment is required, if the application is to run in standalone mode. The exact version of Node.js
depends on the used Kippenstummel API release, but at least Node.js 20+ is required.

First, the application must be built. This is done by running the following command:

```shell
npm run build
```

If all requirements have been met, the application can be started via the following command:

```shell
npm run start
```
