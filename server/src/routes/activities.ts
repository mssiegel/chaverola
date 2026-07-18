import { Router } from "express";

import {
  DEMO_JOIN_CODE,
  HOST_KEY_PATTERN,
  JOIN_CODE_PATTERN,
} from "@chaverola/shared";
import type {
  CreateActivityResponse,
  GetActivityResponse,
  GetHostedActivityResponse,
} from "@chaverola/shared";

import { invalidRequest, notFound } from "../lib/httpErrors";
import {
  createActivityRequestSchema,
  toFieldIssues,
} from "../schemas/activity";
import {
  createActivity,
  getByHostKey,
  getByJoinCode,
} from "../store/activityStore";
import { toActivity, toHostedActivity } from "../store/projections";

/*
  Thin handlers only: validate → store → project → respond, each response
  typed to its shared wire interface. Express 5 forwards thrown errors
  (sync and async) to the error middleware in app.ts.
*/

export const activitiesRouter = Router();

activitiesRouter.post("/", (req, res) => {
  const parsed = createActivityRequestSchema.safeParse(req.body);
  if (!parsed.success) throw invalidRequest(toFieldIssues(parsed.error));

  const stored = createActivity(parsed.data);
  const body: CreateActivityResponse = {
    activity: toHostedActivity(stored),
    hostKey: stored.hostKey,
  };
  res.status(201).json(body);
});

// Registered before /:joinCode so host lookups never fall through to the
// join-code route. A malformed key is a plain 404 — indistinguishable from
// a missing one.
activitiesRouter.get("/host/:hostKey", (req, res) => {
  const { hostKey } = req.params;
  if (!HOST_KEY_PATTERN.test(hostKey)) throw notFound();

  const stored = getByHostKey(hostKey);
  if (!stored) throw notFound();

  const body: GetHostedActivityResponse = {
    activity: toHostedActivity(stored),
  };
  res.json(body);
});

activitiesRouter.get("/:joinCode", (req, res) => {
  const { joinCode } = req.params;
  // The demo code 404s unconditionally — the server never knows the demo,
  // so a compromised server can't impersonate it.
  if (!JOIN_CODE_PATTERN.test(joinCode) || joinCode === DEMO_JOIN_CODE) {
    throw notFound();
  }

  const stored = getByJoinCode(joinCode);
  if (!stored) throw notFound();

  const body: GetActivityResponse = { activity: toActivity(stored) };
  res.json(body);
});
