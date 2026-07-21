import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { DEFAULT_ACTIVITY_SETTINGS, DEMO_JOIN_CODE } from "@chaverola/shared";
import type { CreateActivityRequest } from "@chaverola/shared";

import { buildApp } from "../app";
import { resetForTests } from "../store/activityStore";

// Deliberately light (see the plan doc): the safety invariants and one
// happy path. TTL/sweep, capacity, 429, CORS, and body-parser mapping are
// covered by curl smoke and the browser pass.

const app = buildApp({
  port: 0,
  nodeEnv: "test",
  corsOrigins: [],
  timeScale: 1,
});

const validBody: CreateActivityRequest = {
  hostName: "Ms. Cohen",
  characters: [{ name: "Brutus" }, { name: "Caesar", emoji: "👑" }],
  settings: { ...DEFAULT_ACTIVITY_SETTINGS },
};

beforeEach(() => {
  resetForTests();
});

describe("POST /activities", () => {
  it("201s with a 4-digit join code and a ≥24-char host key", async () => {
    const res = await request(app).post("/activities").send(validBody);
    expect(res.status).toBe(201);
    expect(res.body.activity.joinCode).toMatch(/^\d{4}$/);
    expect(res.body.activity.joinCode).not.toBe(DEMO_JOIN_CODE);
    expect(res.body.hostKey.length).toBeGreaterThanOrEqual(24);
  });
});

describe("GET /activities/:joinCode", () => {
  it("returns the student projection only", async () => {
    const created = await request(app).post("/activities").send(validBody);
    const res = await request(app).get(
      `/activities/${created.body.activity.joinCode}`
    );
    expect(res.status).toBe(200);
    expect(Object.keys(res.body.activity).sort()).toEqual([
      "characters",
      "hostName",
      "joinCode",
    ]);
  });

  it("404s the demo code — the server never knows the demo", async () => {
    const res = await request(app).get(`/activities/${DEMO_JOIN_CODE}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("not_found");
  });
});

describe("GET /activities/host/:hostKey", () => {
  it("a join code structurally cannot unlock the host route", async () => {
    const created = await request(app).post("/activities").send(validBody);
    const res = await request(app).get(
      `/activities/host/${created.body.activity.joinCode}`
    );
    expect(res.status).toBe(404);
  });
});
