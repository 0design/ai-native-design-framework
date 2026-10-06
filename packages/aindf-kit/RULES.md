# AINDF kit rules · stable IDs

Every rule fails loudly with its code; nothing is ignored or auto-fixed. IDs never change meaning;
a retired rule keeps its ID. `test/rules.test.mjs` fails when the kit emits a code missing here.

## DS · Conformance of a design system (`aindf check`, before any bundle)

| ID | Code | Fails when |
|--|--|--|
| AINDF-DS-01 | `SCHEMA` | a source does not validate against its pinned AINDF schema |
| AINDF-DS-02 | `CONFIG_INVALID` | aindf.config.json is not a valid v0.2 config |
| AINDF-DS-03 | `CONFORMS_TO` | the DS does not declare aindf@0.2 |
| AINDF-DS-04 | `UNKNOWN_ROLE` | component role is not in the declared role vocabulary |
| AINDF-DS-05 | `UNCONTRACTED` | classified component has no closed contract |
| AINDF-DS-06 | `UNCLASSIFIED` | contract without a taxonomy entry |
| AINDF-DS-07 | `SLOTS_MISMATCH` | hasSlots disagrees with the slotsets |
| AINDF-DS-08 | `DUPLICATE_EXPORT` | two contracts map to one implementation export |
| AINDF-DS-09 | `TEMPLATE_LAYER` | a template is not a sections-layer component |
| AINDF-DS-10 | `TEMPLATE_CHILDREN_SLOT` | a template maps a slot to children (sections own children) |
| AINDF-DS-11 | `INVALID_PROP_NAME` | prop name is not a camelCase identifier or is reserved (key/ref/routeParams) |
| AINDF-DS-12 | `FORBIDDEN_PROP` | className/style/children/markup/handlers declared as author props |
| AINDF-DS-13 | `ENUM_WITHOUT_VALUES` | enum prop without values |
| AINDF-DS-14 | `UNKNOWN_BINDING` | `aindf check`: a binding prop's allowlist names a binding the DS does not declare. The same code at admission (`validate-screen`, `aindf build`): a screen sets a binding prop outside its allowlist, or its `meta` / `params` names a binding that is unknown or not of kind `data` / `params` |
| AINDF-DS-15 | `BINDING_WITHOUT_ALLOWLIST` | binding prop without an allowlist |
| AINDF-DS-16 | `INVALID_HREF_PATTERN` | richText href pattern is not a valid expression |
| AINDF-DS-17 | `UNKNOWN_SLOT_PROP` | slotProps names a slot that is not declared |
| AINDF-DS-18 | `DANGLING_SLOTSET` | slotset for an unknown component |
| AINDF-DS-19 | `DANGLING_SLOT_TARGET` | slot accepts an unknown component |
| AINDF-DS-20 | `LAYER_RULE` | slot on layer N accepts content above N−1 |
| AINDF-DS-21 | `UNKNOWN_MODIFIER_CATEGORY` | modifier category not declared |
| AINDF-DS-22 | `DANGLING_MODIFIER_TARGET` | modifier targets an unknown component or role |
| AINDF-DS-23 | `DANGLING_PRESET` | preset built on or filled with an unknown component |
| AINDF-DS-24 | `TOKEN_TIER` | foundation token without a raw value |
| AINDF-DS-25 | `DANGLING_TOKEN_ALIAS` | token alias to an unknown token |
| AINDF-DS-26 | `TOKEN_DIRECTION` | token references upward (tiers reference downward only) |
| AINDF-DS-27 | `DS_NOT_CONFORMANT` | bundle refused: the DS has conformance errors |
| AINDF-DS-28 | `BUNDLE_INTEGRITY` | bundle bytes do not match bundleSha256 |
| AINDF-DS-29 | `CORE_PIN` | the Core bundle is not the one pinned in ds.core (id@version) and ds.coreBundleSha256 (content) |
| AINDF-DS-30 | `CORE_CONFORMANCE` | an Instance contract reusing a Core component name accepts less than the Core contract (a prop dropped, another type, required-ness changed, an enum value / binding / mark / inline component dropped, a tighter maxLength / item count / number range, another link pattern, a slot prop dropped), moves the role (a template no longer a template, `routeParams` added, another taxonomy layer, a Core slot dropped or its cardinality tightened), drops a Core component or binding (or changes the kind of a `params` / `data` binding), or adds a required prop or a required slot; a narrower slot `accepts` is deliberately not checked |

## SCR · Admission of a ScreenSpec (`validate-screen`, `aindf build`, trusted builder)

| ID | Code | Fails when |
|--|--|--|
| AINDF-SCR-01 | `SCREEN_SHAPE` | screen or node does not match the ScreenSpec schema (route, kind, types) |
| AINDF-SCR-02 | `UNKNOWN_FIELD` | undeclared field in a screen or node (html, css, code, prototype keys…) |
| AINDF-SCR-03 | `DS_PIN_MISMATCH` | screen is pinned to another DS id/version/bundle |
| AINDF-SCR-04 | `UNKNOWN_COMPONENT` | component is not in this DS revision (request an extension) |
| AINDF-SCR-05 | `NOT_A_TEMPLATE` | template position holds a non-template component |
| AINDF-SCR-06 | `LAYER_MISMATCH` | a screen section is not a sections-layer component |
| AINDF-SCR-07 | `SLOT_REJECTS` | slot does not accept this component |
| AINDF-SCR-08 | `UNKNOWN_SLOT` | component has no such slot |
| AINDF-SCR-09 | `SLOT_CARDINALITY` | slot filled outside its cardinality |
| AINDF-SCR-10 | `UNKNOWN_PROP` | prop not declared on the component contract (own properties only) |
| AINDF-SCR-11 | `MISSING_PROP` | required prop missing |
| AINDF-SCR-12 | `INVALID_TEXT` | text empty or longer than allowed |
| AINDF-SCR-13 | `INVALID_TEXT_LIST` | text list outside item/length bounds |
| AINDF-SCR-14 | `INVALID_ENUM` | value outside the declared enum |
| AINDF-SCR-15 | `INVALID_BOOLEAN` | not a boolean |
| AINDF-SCR-16 | `INVALID_NUMBER` | not a finite number in range |
| AINDF-SCR-17 | `INVALID_RICH_TEXT` | richText item, mark, inline component or href not allowed |
| AINDF-SCR-18 | `ROUTE_PARAMS` | [param] route without params binding, or params on a static route |
| AINDF-SCR-19 | `ROUTE_PARAMS_UNAVAILABLE` | route-param component used on a static route |
| AINDF-SCR-20 | `DUPLICATE_ROUTE` | two screens claim one route |

## BLD · Trusted build (`aindf build --check`, build-mvp gate)

| ID | Code | Fails when |
|--|--|--|
| AINDF-BLD-01 | `SCREEN_REJECTED` | codegen refused a screen that fails admission |
| AINDF-BLD-02 | `GENERATED_MISSING` | a screen has no generated page |
| AINDF-BLD-03 | `GENERATED_DRIFT` | generated page differs from screen + DS bundle (manual edit, stale spec, DS change) |
| AINDF-BLD-04 | `ORPHAN_GENERATED` | generated page without a screen |

## MCP · DS-MCP authoring boundary

| ID | Code | Fails when |
|--|--|--|
| AINDF-MCP-01 | `READ_ONLY` | endpoint has no staging; drafts cannot be submitted |
| AINDF-MCP-02 | `UNAUTHORIZED` | submit/extension request without a valid author token |
