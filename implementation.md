# FlowForge AI — Implementation

## 1. Architecture

```text
                         ┌──────────────────────┐
                         │   React / Next.js    │
                         │     Workflow UI      │
                         └──────────┬───────────┘
                                    |
                                    v
                         ┌──────────────────────┐
                         │      FastAPI         │
                         │     API Server       │
                         └───────┬───────┬──────┘
                                 |       |
                    ┌────────────┘       └─────────────┐
                    v                                  v
             ┌──────────────┐                   ┌──────────────┐
             │   MongoDB    │                   │    Redis     │
             │ Persistent   │                   │ Cache/Queue  │
             │    Data      │                   └──────┬───────┘
             └──────────────┘                          |
                                                       v
                                            ┌────────────────────┐
                                            │ Workflow Workers   │
                                            │ Worker 1           │
                                            │ Worker 2           │
                                            │ Worker N           │
                                            └─────────┬──────────┘
                                                      |
                         ┌────────────────────────────┼─────────────────┐
                         v                            v                 v
                  ┌─────────────┐              ┌────────────┐    ┌─────────────┐
                  │ LLM APIs    │              │ Vector DB  │    │ External APIs│
                  └─────────────┘              └────────────┘    └─────────────┘
```

## 2. Technology Stack

### Backend

- Python 3.12+
- FastAPI
- Pydantic
- Uvicorn
- asyncio
- HTTPX

### Data

- MongoDB
- Redis
- Qdrant or pgvector

### AI

- OpenAI-compatible LLM API
- Embedding API
- RAG pipeline
- Optional LangChain/LlamaIndex components

### Frontend

- React
- Next.js
- TypeScript
- React Flow for workflow visualization

### Infrastructure

- Docker
- Docker Compose
- Nginx
- GitHub Actions
- Prometheus
- Grafana

## 3. Core Components

### 3.1 API Server

FastAPI exposes APIs for:

```text
POST   /workflows
GET    /workflows
GET    /workflows/{workflow_id}
PUT    /workflows/{workflow_id}
DELETE /workflows/{workflow_id}

POST   /workflows/{workflow_id}/runs
GET    /runs/{run_id}
GET    /runs/{run_id}/events

POST   /documents
POST   /search
```

The API server should remain lightweight. It should not execute long-running AI workflows directly.

### 3.2 Workflow Definition

A workflow is represented as a directed graph.

Example:

```json
{
  "name": "Document QA",
  "nodes": [
    {
      "id": "input",
      "type": "input"
    },
    {
      "id": "retriever",
      "type": "vector_search"
    },
    {
      "id": "llm",
      "type": "llm"
    }
  ],
  "edges": [
    {
      "source": "input",
      "target": "retriever"
    },
    {
      "source": "retriever",
      "target": "llm"
    }
  ]
}
```

The workflow definition should be versioned so an existing run always refers to the exact workflow configuration used when that run started.

## 4. Workflow Execution Engine

The execution engine is the core component.

### Execution process

```text
Receive workflow ID
        |
        v
Load immutable workflow version
        |
        v
Validate graph
        |
        v
Find executable nodes
        |
        v
Schedule node
        |
        v
Execute node
        |
        v
Store node result
        |
        v
Unlock dependent nodes
        |
        v
Repeat until complete
```

The engine should support DAG validation and prevent cycles in the initial implementation.

## 5. Asynchronous Execution

The API should return quickly when a workflow is started.

```text
Client
  |
  | POST /workflows/{id}/runs
  v
FastAPI
  |
  | create run
  v
Redis Queue
  |
  v
Worker
  |
  v
Workflow Execution
```

Example response:

```json
{
  "run_id": "run_123",
  "status": "queued"
}
```

The client can then query the run or subscribe to execution events.

## 6. Worker Model

Workers consume workflow execution jobs from Redis.

Each worker:

1. Fetches a job.
2. Loads workflow state.
3. Executes eligible nodes.
4. Persists results.
5. Updates run status.
6. Schedules newly eligible nodes.
7. Retries transient failures.

Workers should be stateless so multiple instances can run simultaneously.

## 7. Parallel Execution

Independent nodes should execute concurrently.

Example:

```text
             ┌──> Web Search ───┐
Input ───────┤                   ├──> LLM
             └──> Vector Search ┘
```

Instead of:

```text
Input -> Web Search -> Vector Search -> LLM
```

the engine can execute Web Search and Vector Search concurrently.

Python's `asyncio.gather()` can be used for I/O-bound operations.

## 8. Redis Usage

Redis will have several responsibilities.

### Cache

Cache expensive and repeatable operations where appropriate:

```text
embedding:{model}:{hash}
search:{index}:{query_hash}
```

### Queue

Store pending workflow jobs.

### Temporary execution state

Use Redis for short-lived coordination data where appropriate, while keeping durable workflow state in MongoDB.

## 9. MongoDB Usage

MongoDB collections:

```text
users
workflows
workflow_versions
workflow_runs
node_runs
documents
integrations
```

Important indexes should be added based on actual query patterns.

Examples:

```text
workflow_runs(workflow_id, created_at)
node_runs(run_id)
workflows(owner_id, updated_at)
```

## 10. RAG Pipeline

The RAG pipeline:

```text
Document
   |
   v
Parser
   |
   v
Chunker
   |
   v
Embedding Model
   |
   v
Vector Database
   |
   v
Similarity Search
   |
   v
Retrieved Context
   |
   v
LLM
```

Documents should be processed asynchronously because parsing and embedding can be expensive.

## 11. Error Handling

Failures should be classified.

### Retryable

- Network timeout
- Temporary provider failure
- HTTP 429
- Temporary database connection failure

### Non-retryable

- Invalid workflow configuration
- Invalid input
- Unsupported node type
- Authentication failure
- Malformed request

Retries should use exponential backoff and have a maximum retry count.

## 12. Idempotency

Workflow execution must avoid accidentally performing the same side effect multiple times.

For externally visible operations, use idempotency keys such as:

```text
run_id + node_id + attempt
```

The implementation should distinguish between safe-to-repeat operations and side-effecting operations.

## 13. Observability

Each workflow run should expose:

- Total execution time
- Node execution time
- Node status
- Retry count
- Error information
- Queue wait time

Prometheus metrics can include:

```text
workflow_runs_total
workflow_failures_total
workflow_execution_duration_seconds
workflow_queue_wait_seconds
node_execution_duration_seconds
llm_requests_total
llm_request_duration_seconds
cache_hit_total
cache_miss_total
```

## 14. Performance Optimization

Performance work should be measurable.

Initial benchmarks:

1. Sequential vs concurrent execution.
2. Cached vs uncached embeddings.
3. Different worker counts.
4. Different concurrency levels.
5. MongoDB query performance before and after indexing.
6. API latency under concurrent requests.

The project should report actual benchmark results rather than making unsupported scalability claims.

## 15. Security

Initial security features:

- JWT authentication
- Password hashing
- API key encryption/storage strategy
- Request validation through Pydantic
- Rate limiting
- Per-user workflow isolation
- Environment-based secret management

## 16. Deployment

Local development:

```text
Docker Compose
├── FastAPI
├── MongoDB
├── Redis
├── Qdrant
├── Worker
├── Prometheus
└── Grafana
```

Production can later use separate services and horizontally scaled workers.

## 17. Testing

Tests should cover:

- Workflow validation
- DAG execution
- Node execution
- Retry behavior
- Failure recovery
- Redis queue behavior
- API endpoints
- Database operations
- Authentication
- Concurrent execution

Use:

- pytest
- pytest-asyncio
- HTTPX test client
- Integration tests with Docker services
