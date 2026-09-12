import { siteTypes } from "@greecon/shared";
import { createSiteAction } from "../app/admin/actions";

// Plain server-action form, no client JavaScript needed — unlike CreateUserForm there is no
// one-time secret to display inline, so a normal progressive-enhancement submit + revalidation
// is enough (same pattern as the logout form in components/Shell.tsx).
export function CreateSiteForm() {
  return (
    <form action={createSiteAction} className="rule-form">
      <div className="rule-form__grid">
        <label>
          Name
          <input name="name" placeholder="e.g. Durres Farm Site" required />
        </label>
        <label>
          Type
          <select name="type" defaultValue="farm">
            {siteTypes
              .filter((type) => type !== "demo_site")
              .map((type) => (
                <option key={type} value={type}>
                  {type.replace(/_/g, " ")}
                </option>
              ))}
          </select>
        </label>
        <label>
          Location
          <input name="locationName" placeholder="e.g. Durres, Albania" required />
        </label>
      </div>
      <div className="rule-form__footer">
        <button type="submit">Create site</button>
      </div>
    </form>
  );
}
