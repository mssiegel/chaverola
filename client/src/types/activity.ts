/*
  Re-export shim: the activity types are the wire contract now and live in
  @chaverola/shared. Existing `@/types/activity` import sites stay valid.
*/
export type {
  Activity,
  ActivitySettings,
  HostedActivity,
} from "@chaverola/shared";
