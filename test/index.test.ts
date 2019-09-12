import {
  removeCodes,
  includeCodes,
  changeMinItems,
  Arr,
  changeMaxItems,
  changeRequiredStatus,
  changeToConst,
  changeListToTuple
} from "../src";
import petstore from "./petstore";

test("removeCodes removes 200 and 201 everywhere", () => {
  const refined = removeCodes("/pets", ["200", "201"])(petstore);
  const refinedResponsesGet =
    (refined.paths["/pets"] &&
      refined.paths["/pets"].get &&
      refined.paths["/pets"].get.responses) ||
    {};
  const refinedResponsesPost =
    (refined.paths["/pets"] &&
      refined.paths["/pets"].post &&
      refined.paths["/pets"].post.responses) ||
    {};
  const responsesGet =
    (petstore.paths["/pets"] &&
      petstore.paths["/pets"].get &&
      petstore.paths["/pets"].get.responses) ||
    {};
  const responsesPost =
    (petstore.paths["/pets"] &&
      petstore.paths["/pets"].post &&
      petstore.paths["/pets"].post.responses) ||
    {};
  expect(Object.keys(refinedResponsesGet)).toEqual(["default"]);
  expect(refinedResponsesGet.default).toEqual(responsesGet.default);
  expect(Object.keys(refinedResponsesPost)).toEqual(["default"]);
  expect(refinedResponsesPost.default).toEqual(responsesPost.default);
});

test("removeCodes removes 200", () => {
  const refined = removeCodes(["/pets", "get"], ["200"])(petstore);
  const refinedResponses =
    (refined.paths["/pets"] &&
      refined.paths["/pets"].get &&
      refined.paths["/pets"].get.responses) ||
    {};
  const resposnes =
    (petstore.paths["/pets"] &&
      petstore.paths["/pets"].get &&
      petstore.paths["/pets"].get.responses) ||
    {};
  expect(Object.keys(refinedResponses)).toEqual(["default"]);
  expect(refinedResponses.default).toEqual(resposnes.default);
});

test("removeCodes removes all codes", () => {
  const refined = removeCodes(["/pets", "get"], ["200", "default"])(petstore);
  const refinedResponses =
    (refined.paths["/pets"] &&
      refined.paths["/pets"].get &&
      refined.paths["/pets"].get.responses) ||
    {};
  expect(Object.keys(refinedResponses)).toEqual([]);
});

test("includeCodes includes 200", () => {
  const refined = includeCodes(["/pets", "get"], ["200"])(petstore);
  const responses =
    (refined.paths["/pets"] &&
      refined.paths["/pets"].get &&
      refined.paths["/pets"].get.responses) ||
    {};
  const refinedResponses =
    (petstore.paths["/pets"] &&
      petstore.paths["/pets"].get &&
      petstore.paths["/pets"].get.responses) ||
    {};
  expect(Object.keys(responses)).toEqual(["200"]);
  expect(refinedResponses["200"]).toEqual(responses["200"]);
});

test("includeCodes works on regex", () => {
  const refined = includeCodes(new RegExp("[a-zA-Z0-9/{}]*"), ["default"])(
    petstore
  );
  const petsResponses =
    (refined.paths["/pets"] &&
      refined.paths["/pets"].get &&
      refined.paths["/pets"].get.responses) ||
    {};
  expect(Object.keys(petsResponses)).toEqual(["default"]);
  const petsIdResponses =
    (refined.paths["/pets/{petId}"] &&
      refined.paths["/pets/{petId}"].get &&
      refined.paths["/pets/{petId}"].get.responses) ||
    {};
  expect(Object.keys(petsIdResponses)).toEqual(["default"]);
});

test("includeCodes includes all codes", () => {
  const refined = includeCodes(["/pets", "get"], ["200", "default"])(petstore);
  const responses =
    (refined.paths["/pets"] &&
      refined.paths["/pets"].get &&
      refined.paths["/pets"].get.responses) ||
    {};
  expect(Object.keys(responses)).toEqual(["200", "default"]);
});

test("everything is composeable", () => {
  const refined = [
    includeCodes(["/pets", "get"], ["200"]),
    removeCodes(["/pets", "post"], ["201"])
  ].reduce((a, b) => b(a), petstore);
  const refinedResponsesGet =
    (refined.paths["/pets"] &&
      refined.paths["/pets"].get &&
      refined.paths["/pets"].get.responses) ||
    {};
  const refinedResponsesPost =
    (refined.paths["/pets"] &&
      refined.paths["/pets"].post &&
      refined.paths["/pets"].post.responses) ||
    {};
  const responsesGet =
    (petstore.paths["/pets"] &&
      petstore.paths["/pets"].get &&
      petstore.paths["/pets"].get.responses) ||
    {};
  const responsesPost =
    (petstore.paths["/pets"] &&
      petstore.paths["/pets"].post &&
      petstore.paths["/pets"].post.responses) ||
    {};
  expect(Object.keys(refinedResponsesGet)).toEqual(["200"]);
  expect(refinedResponsesGet["200"]).toEqual(responsesGet["200"]);
  expect(Object.keys(refinedResponsesPost)).toEqual(["default"]);
  expect(refinedResponsesPost.default).toEqual(responsesPost.default);
});

test("changeMinItems changes min items", () => {
  const refined = changeMinItems(5)(petstore, "/pets", ["200"], []);
  expect(
    (<any>refined).paths["/pets"].get.responses["200"].content[
      "application/json"
    ].schema.minItems
  ).toBe(5);
});

test("changeMaxItems changes max items on nested object", () => {
  const refined = changeMaxItems(63)(petstore, "/pets", ["200"], [Arr, "tags"]);
  expect(
    (<any>refined).paths["/pets"].get.responses["200"].content[
      "application/json"
    ].schema.items.properties.tags.maxItems
  ).toBe(63);
  expect(
    (<any>refined).paths["/pets"].get.responses["200"].content[
      "application/json"
    ].schema.maxItems
  ).toBe(undefined);
});

test("changeRequiredStatus changes required status on nested object", () => {
  const refined = changeRequiredStatus("tags")(
    petstore,
    "/pets",
    ["200"],
    [Arr]
  );
  expect(
    new Set(
      (<any>refined).paths["/pets"].get.responses["200"].content[
        "application/json"
      ].schema.items.required
    )
  ).toEqual(new Set(["id", "name", "tags"]));
});

test("changeToConst accepts const with empty array", () => {
  const refined = changeToConst([])(petstore, "/pets", ["200"], []);
  expect(
    (<any>refined).paths["/pets"].get.responses["200"].content[
      "application/json"
    ].schema.items
  ).toEqual([]);
});

test("changeToConst accepts const with full array", () => {
  const refined = changeToConst([
    { id: 0, name: "Fluffy" },
    { id: 1, name: "Trix", tags: ["foo", "bar"] }
  ])(petstore, "/pets", ["200"], []);
  expect(
    (<any>refined).paths["/pets"].get.responses["200"].content[
      "application/json"
    ].schema.items[0].properties.id.enum[0]
  ).toBe(0);
  expect(
    (<any>refined).paths["/pets"].get.responses["200"].content[
      "application/json"
    ].schema.items[1].properties.id.enum[0]
  ).toBe(1);
  expect(
    (<any>refined).paths["/pets"].get.responses["200"].content[
      "application/json"
    ].schema.items[1].properties.name.enum[0]
  ).toBe("Trix");
  expect(
    (<any>refined).paths["/pets"].get.responses["200"].content[
      "application/json"
    ].schema.items[1].properties.tags.items[0].enum[0]
  ).toBe("foo");
});

test("changeListToTuple length is correct", () => {
  const refined = changeListToTuple(5)(petstore, "/pets", ["200"], []);
  expect(
    (<any>refined).paths["/pets"].get.responses["200"].content[
      "application/json"
    ].schema.items.length
  ).toEqual(5);
});
