import {
  OpenAPIObject,
  Operation,
  PathItem,
  Responses,
  isOperation,
  Response,
  Reference,
  isResponse,
  isReference,
  Components,
  Schema,
  isSchema,
  MediaType
} from "loas3/dist/generated/full";

import { some, none, Option, fold } from "fp-ts/lib/Option";
import { array } from "fp-ts/lib/Array";
import {
  Lens,
  Iso,
  fromTraversable,
  Prism,
  Traversal,
  Optional,
  Getter,
  Setter
} from "monocle-ts";

const objectToArray = <T>() =>
  new Iso<Record<string, T>, [string, T][]>(
    s => Object.entries(s),
    a => a.reduce((q, r) => ({ ...q, [r[0]]: r[1] }), {})
  );

const valueLens = <T>() =>
  new Lens<[string, T], T>(s => s[1], a => s => [s[0], a]);

type Meth = "get" | "post" | "put" | "delete";
const metha: Meth[] = ["get", "post", "put", "delete"];

const _getResponseFromRef = (
  o: OpenAPIObject,
  i: Response | Reference
): Option<Response> =>
  i
    ? isReference(i)
      ? getResponseFromRef(o, i.$ref.split("/")[3])
      : some(i)
    : none;

const getResponseFromRef = (o: OpenAPIObject, d: string): Option<Response> =>
  new Getter((a: OpenAPIObject) => (a.components ? some(a.components) : none))
    .composeGetter<Option<Record<string, Response | Reference>>>(
      new Getter(
        fold<Components, Option<Record<string, Response | Reference>>>(
          () => none,
          a => (a.responses ? some(a.responses) : none)
        )
      )
    )
    .composeGetter<Option<Response>>(
      new Getter(
        fold<Record<string, Response | Reference>, Option<Response>>(
          () => none,
          a => _getResponseFromRef(o, a[d])
        )
      )
    )
    .get(o);

/// TODO: combine with above?

const _getSchemaFromRef = (
  o: OpenAPIObject,
  i: Schema | Reference
): Option<Schema> =>
  i
    ? isReference(i)
      ? getSchemaFromRef(o, i.$ref.split("/")[3])
      : some(i)
    : none;

const getSchemaFromRef = (o: OpenAPIObject, d: string): Option<Schema> =>
  new Getter((a: OpenAPIObject) => (a.components ? some(a.components) : none))
    .composeGetter<Option<Record<string, Schema | Reference>>>(
      new Getter(
        fold<Components, Option<Record<string, Schema | Reference>>>(
          () => none,
          a => (a.schemas ? some(a.schemas) : none)
        )
      )
    )
    .composeGetter<Option<Schema>>(
      new Getter(
        fold<Record<string, Schema | Reference>, Option<Schema>>(
          () => none,
          a => _getSchemaFromRef(o, a[d])
        )
      )
    )
    .get(o);

const lensToResponses = ([path, meths]: [RegExp, Meth[]]) =>
  Lens.fromProp<OpenAPIObject>()("paths")
    .composeIso(objectToArray())
    .composeTraversal(
      fromTraversable(array)<[string, PathItem]>().filter(i => path.test(i[0]))
    )
    .composeLens(valueLens())
    .composeIso(objectToArray<any>())
    .composeTraversal(
      fromTraversable(array)<[string, any]>().filter(
        i => meths.map(z => `${z}`).indexOf(i[0]) !== -1
      )
    )
    .composeLens(valueLens())
    .composePrism(
      new Prism<any, Operation>(s => (isOperation(s) ? some(s) : none), a => a)
    )
    .composeLens(Lens.fromProp<Operation>()("responses"));

const minItems = (i: number) => (s: Schema): Schema => ({
  ...s,
  minItems: i
});

const maxItems = (i: number) => (s: Schema): Schema => ({
  ...s,
  maxItems: i
});

const drillDownSchemaProperty = (o: OpenAPIObject, i: string) =>
  Optional.fromNullableProp<Schema>()("properties")
    .composeOptional(
      Optional.fromNullableProp<Record<string, Schema | Reference>>()(i)
    )
    .composePrism(
      new Prism(
        s =>
          isReference(s) ? getSchemaFromRef(o, s.$ref.split("/")[3]) : some(s),
        a => a
      )
    );

const drillDownSchemaItem = (o: OpenAPIObject) =>
  Optional.fromNullableProp<Schema>()("items").composePrism(
    new Prism(
      s =>
        isReference(s) ? getSchemaFromRef(o, s.$ref.split("/")[3]) : some(s),
      a => a
    )
  );

export const Arr: unique symbol = Symbol();
const drillDownSchemaOneLevel = (o: OpenAPIObject, i: string | typeof Arr) =>
  i === Arr ? drillDownSchemaItem(o) : drillDownSchemaProperty(o, i);
const downToSchema = (
  o: OpenAPIObject,
  info: [RegExp, Meth[]],
  responses: (keyof Responses)[]
) =>
  lensToResponses(info)
    .composeIso(objectToArray<any>())
    .composeTraversal(
      fromTraversable(array)<[string, any]>().filter(
        i => responses.map(z => `${z}`).indexOf(i[0]) !== -1
      )
    )
    .composeLens(valueLens())
    .composePrism(
      new Prism<any, Response>(
        s =>
          isResponse(s)
            ? some(s)
            : isReference(s)
            ? getResponseFromRef(o, s.$ref.split("/")[3])
            : none,
        a => a
      )
    )
    .composeOptional(Optional.fromNullableProp<Response>()("content"))
    .composeOptional(
      Optional.fromNullableProp<Record<string, MediaType>>()("application/json")
    )
    .composeOptional(Optional.fromNullableProp<MediaType>()("schema"));

const changeSingleSchema = (s2s: (s: Schema) => Schema) => (
  o: OpenAPIObject,
  info: [string | RegExp, Meth | Meth[]] | string | RegExp,
  responses: (keyof Responses)[],
  path: (string | typeof Arr)[]
) =>
  downToSchema(o, argumentCoaxer(info), responses)
    .composePrism(
      new Prism(
        s =>
          isReference(s) ? getSchemaFromRef(o, s.$ref.split("/")[3]) : some(s),
        a => a
      )
    )
    .modify(
      path
        .reverse()
        .reduce((cur, mxt) => drillDownSchemaOneLevel(o, mxt).modify(cur), s2s)
    )(o);

export const changeMinItems = (i: number) => changeSingleSchema(minItems(i));
export const changeMaxItems = (i: number) => changeSingleSchema(maxItems(i));
const codesInternal = (
  o: OpenAPIObject,
  info: [RegExp, Meth[]],
  responsesMap: (z: Responses) => Responses
) => lensToResponses(info).modify(responsesMap)(o);

const argumentCoaxer = (
  info: [string | RegExp, Meth | Meth[]] | string | RegExp
): [RegExp, Meth[]] =>
  typeof info === "string" || info instanceof RegExp
    ? [info instanceof RegExp ? info : new RegExp(`^${info}$`), metha]
    : [
        info[0] instanceof RegExp ? info[0] : new RegExp(`^${info[0]}$`),
        info[1] instanceof Array ? info[1] : [info[1]]
      ];

const includeCodesInternal = (
  o: OpenAPIObject,
  info: [RegExp, Meth[]],
  r: (keyof Responses)[]
) =>
  codesInternal(o, info, z =>
    r.map(i => ({ [i]: z[i] })).reduce((a, b) => ({ ...a, ...b }), {})
  );

export const includeCodes = (
  info: [string | RegExp, Meth] | string | RegExp,
  r: (keyof Responses)[]
) => (o: OpenAPIObject): OpenAPIObject =>
  includeCodesInternal(o, argumentCoaxer(info), r);

const removeCode = (r: Responses, c: keyof Responses) => {
  const out = { ...r };
  delete out[c];
  return out;
};

const removeCodesInternal = (
  o: OpenAPIObject,
  info: [RegExp, Meth[]],
  r: (keyof Responses)[]
) => codesInternal(o, info, z => r.reduce(removeCode, z));

export const removeCodes = (
  info: [string | RegExp, Meth] | string | RegExp,
  r: (keyof Responses)[]
) => (o: OpenAPIObject): OpenAPIObject =>
  removeCodesInternal(o, argumentCoaxer(info), r);
