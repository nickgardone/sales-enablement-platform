export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: "SALES_ASSOCIATE" | "SALES_LEADER" | "ADMIN";
  /** Set only for SALES_ASSOCIATE — their Associate profile id (drives OWN-scope filters). */
  associateId: string | null;
  /** The associate's team, or the team the leader leads. Null for admin. */
  teamId: string | null;
  /** That team's territory — drives TEAM-scope filters for both associates and leaders. */
  territoryId: string | null;
};
