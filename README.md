# Kippenstummel API

> Backend API for Kippenstummel.

![](https://img.shields.io/badge/Node.js-20-green?logo=node.js)
![](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs)

![Banner](./docs/images/banner.svg)

## Table of contents

- [Introduction](#introduction)
- [Deployment](#deployment)
- [Architecture](#architecture)
- [License](#license)
  - [Forbidden](#forbidden)

## Introduction

This is the backend API for Kippenstummel. It is a simple API that contains
the necessary endpoints and application logic of the platform.

## Deployment

Kippenstummel API is generally operated on-premise. There are a few steps to
follow for installation: Firstly, the appropriate system environment with its
third-party services must be set up (See [Operation](docs/operation.md)) and secondly,
the application must be correctly configured (See [Configuration](docs/configuration.md)).
After that, Kippenstummel API can then be started and operated on-premise, optionally
scaled horizontally.

## Architecture

The following sections describe the architecture of the application and are of particular
interest to developers. The figure below shows a rough overview of the application's
structure. The application is essentially written as a modular monolith. The business
logic is therefore divided into modules.

![Architecture Overview](./docs/images/architecture-overview.svg)

As the figure shows, the application is divided into the following modules:

- **Ident**: Module that handles anonymous user authentication. It issues
  anonymous identities, the related access tokens and provides the necessary
  utilities to assess a user identity's credibility. The module is classically
  structured according to the CRUD principle.
- **CVM**: This module contains the business logic for the actual management
  of the cigarette vending machines (CVMs). The module is designed according to
  the Event Sourcing Pattern.
- **KMC**: This module primarily provides the endpoints for the Management Console,
  hence the platform's administrative interfaces. The module largely contains no
  business logic of its own, but instead uses the data from other modules and prepares
  it for the admin view.

In addition to the actual business logic, the application also uses a number of
infrastructure components. These include an event bus and a job queue, as well as
various persistence interfaces. The application also has an external data interface,
which is implemented as an HTTP RESTful interface that is used by external services.

The event bus is used to propagate events application wide. This allows loose coupling
of the application's modules and the infrastructure components. Because this is a
monolith, although horizontally scalable, the events are not propagated beyond the application
boundaries. Hence, the event bus is instance specific and events are not shared between
instances. The job queue, internally Redis based, is used for handling asynchronous and
repeated tasks. This prevents performance issues because of time consuming operations and
allows detailled monitoring of running jobs.

In the persistence layer, three logical stores are generally used, all of which are
implemented using MongoDB or Redis. The following three logical stores exist:

- **ODM**: A classical CRUD store for storing business data. A Object Document
  Mapper (ODM) is used for storing common business data using the CRUD principle.
  The ODM is backed by MongoDB.
- **Event Store**: More complex domains are using the Event Sourcing Pattern. Hence,
  an event store is required for storing the event history of used aggregates.
  The event store is also backed by MongoDB.
- **Cache**: A cache for storing frequently accessed data, this includes temporary
  tokens, job logs and similar. The cache is backed by Redis.

## License

Copyright (c) 2025 Constantin Müller

[GNU AFFERO GENERAL PUBLIC LICENSE](https://www.gnu.org/licenses/) or [LICENSE](LICENSE) for
more details.

### Forbidden

**Hold Liable**: Software is provided without warranty and the software
author/license owner cannot be held liable for damages.
