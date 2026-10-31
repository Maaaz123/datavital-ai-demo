# Quality & Safety — Source-to-Target Mapping

**BUILD_ID:** `v76-quality-domain`  
**Status:** Expected patterns only — no Production Source Verified mappings.

| Canonical target | Expected source system | Expected object | Join keys | Coverage note |
|---|---|---|---|---|
| Safety incident report | Incident reporting / RL / Datix-class | Incident report | `hospital_id`, incident_id, `calendar_period_id` | Demo aggregates only |
| Validated safety event | Patient safety office review | Validated event | incident_id → validated_event_id | Human validation required |
| Harm classification | Safety taxonomy | Severity label | validated_event_id | Versioned demo taxonomy |
| Device exposure day | EHR / device documentation | Device-day census | `hospital_id`, unit, device_type, date | Required for CLABSI/CAUTI |
| Infection surveillance case | IPC surveillance worksheet | Surveillance case | case_id, definition_version | Not certified NHSN export |
| Hand hygiene observation | IPC audit app | Observation | opportunity_id, observer_id | Sample ≠ universe |
| CAPA action | Quality governance system | Corrective action | capa_id, rca_id | Approval ≠ effectiveness |
| Outcome cohort | EHR / coding | Index discharge / procedure | `encounter_id`, eligibility flags | Same-facility readmissions only |

Missing joins fail closed: rates require eligible denominators; SIR remains unavailable.
