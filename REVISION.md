# Architecture and verification review

Date: 2026-11-02

## Scope and reference

Applied the IA project's review principles to this vanilla application: focused responsibilities, boundary validation, no unnecessary dependencies, unit and integration checks, and an 80% line-coverage gate. Java/Spring-specific rules are not applicable here.

## Architecture decisions

- Keep jugadores.json as the single checked-in data source, with explicit positive stable IDs. No parallel db.json.
- Keep the genetic algorithm and exact position constraints in equipos.js. Selection parsing and the UI-specific 10–22 limit belong in seleccion.js.
- Keep browser events/rendering in script.js and layout in styles.css. The UI displays truncated two-digit ratings while the algorithm retains full precision.
- Session additions are exported as JSON; they do not write to the project automatically. No persistence service is needed for this scope.
- Export crearServidor() so HTTP tests can use an isolated ephemeral port without starting the normal port 3000. Direct execution remains npm run web.
- Serve only explicitly allowed files, bind to loopback, reject writes, and render player-controlled strings as text. Malformed URL parsing is guarded.

## Verification plan and results

- Unit tests: score precision, validation, parsing IDs, duplicates, unknown IDs, formations, seeds.
- Integration tests: manual selection through generation, stable IDs, input immutability, substitutes and F11 with additional players.
- HTTP integration: public HTML/CSS/JS/JSON, MIME types, nosniff, HEAD without body, private/unknown paths rejected, POST rejected.
- Browser acceptance previously executed by Juli in a separate QA tab: F5/F9, checkbox synchronization, invalid IDs, quantity/position errors, session additions and F11. Desktop 1920x950 fits the initial screen; mobile 390x844 has no horizontal overflow. These were interactive checks, not automated browser tests. Later help text and hiding H/F were small presentation changes, not a fresh full browser run.
- Automated result: 13/13 pass. Measured coverage: 97.26% lines across equipos.js, seleccion.js, salida.js and servidor.js; browser event code is excluded from this figure. Core algorithm and selection each have 100% line coverage. Coverage does not imply genetic optimality.
- npm run verify repeats syntax checks and the automated suite with an 80% line threshold. Local HTTP connections need permission in restricted environments.

## Review conclusion

No blocking architecture or security findings for the current local application. Preserve the simple vanilla design. Future automated browser tests and import/persistence can be added when their scope is requested. The application remains a local tool; this review does not establish suitability as a public multi-user service.
