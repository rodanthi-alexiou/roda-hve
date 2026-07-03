---
title: "Met API and Agent Tools Reference"
description: "The Met Collection API endpoints, key fields, and how each agent tool maps to them"
author: Microsoft
ms.date: 2026-07-03
ms.topic: reference
keywords:
  - met collection api
  - api reference
  - agent tools
estimated_reading_time: 6
---

## Met API and Agent Tools Reference

This reference documents the Metropolitan Museum of Art Collection API endpoints
used in the walkthrough and how each agent tool maps to them.

### About the API

The Met Collection API is open, keyless, and returns CC0 public-domain metadata.

| Property | Value |
| -------------- | ------------------------------------------------------------ |
| Base URL | `https://collectionapi.metmuseum.org/public/collection/v1` |
| Authentication | None |
| License | CC0 (public domain) for flagged objects |
| Rate limit | 80 requests per second |
| Objects | 470,000+ |

### Endpoints

| Endpoint | Returns | Notes |
| ------------------ | ------------------------------ | ------------------------------------------------ |
| `/search` | An array of object IDs only | You must fan out to `/objects/{id}` for details |
| `/objects/{id}` | Full metadata and image URLs | The workhorse; batch and cache these calls |
| `/objects` | All object IDs and a total | Rarely needed for the demo |
| `/departments` | The list of departments | Powers themed, cross-department tours |

### Key search filters

Pass these as query parameters on `/search`.

| Filter | Purpose |
| ------------------ | ---------------------------------------------- |
| `q` | Free-text query (required by `/search`) |
| `isHighlight` | Limit to curator-highlighted works |
| `hasImages` | Limit to works with images (always use this) |
| `isOnView` | Limit to works currently on display |
| `departmentId` | Limit to a department |
| `medium` | Filter by medium, for example Paintings |
| `geoLocation` | Filter by geographic location |
| `tags` | Filter by subject tags, for example Cats |
| `dateBegin` / `dateEnd` | Filter by date range |
| `artistOrCulture` | Match against the artist or culture field |
| `title` | Match against the title field |

### Key object fields

Returned by `/objects/{id}`.

| Field | Use |
| ---------------- | ------------------------------------------------ |
| `isPublicDomain` | Only display when true |
| `primaryImage` | The full-resolution image URL |
| `department` | Grouping for cross-department tours |
| `culture` | Powers cross-cultural connections |
| `period` | Sequences works by era |
| `medium` | Describes the material |
| `tags` | Subject tags for finding related works |
| `title` | Display title |

### Agent tool mapping

Each agent tool maps to one or more endpoints.

| Agent tool | Parameters | Endpoint | Notes |
| ------------------- | ------------------------------------------------------------------------ | ------------------- | ------------------------------------------- |
| `search_collection` | `q`, `departmentId`, `medium`, `geoLocation`, `dateBegin`, `dateEnd`, `hasImages`, `isHighlight`, `isOnView`, `tags` | `/search` | Returns IDs; the tool fans out to get objects |
| `get_object` | `objectID` | `/objects/{id}` | Batched and cached in the tool layer |
| `list_departments` | none | `/departments` | Enables themed, cross-department tours |
| `build_tour` | derived | derived | Sequences results by tag, culture, or period |
| `find_related` | `objectID` | derived | Matches on shared tags, culture, or period |

### The N+1 guardrail

Because `/search` returns only IDs, retrieving details for a result set is an
N+1 problem. The tool layer solves it with a batched, cached fetch that caps
concurrency and filters to public-domain works with images. See
[Step 3](05-step-3-met-tools.md) for the implementation.

### Official documentation

For the authoritative API details, see the
[Met Collection API documentation](https://metmuseum.github.io/).

### Back to the walkthrough

Return to the [walkthrough index](README.md).
