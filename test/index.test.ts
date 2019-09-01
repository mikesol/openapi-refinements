import { removeCodes, includeCodes } from "../src";
import petstore from "./petstore";


test("removeCodes removes 200 and 201 everywhere", () => {
  const rc = removeCodes(petstore, "/pets", ["200", "201"]);
  const responsesGet = rc.paths["/pets"] && rc.paths["/pets"].get && rc.paths["/pets"].get.responses || {};
  const responsesPost = rc.paths["/pets"] && rc.paths["/pets"].post && rc.paths["/pets"].post.responses || {};
  expect(Object.keys(responsesGet)).toEqual(["default"]);
  expect(responsesGet.default).toEqual(petstore.paths["/pets"].get.responses.default);
  expect(Object.keys(responsesPost)).toEqual(["default"]);
  expect(responsesPost.default).toEqual(petstore.paths["/pets"].post.responses.default);
});

test("removeCodes removes 200", () => {
  const rc = removeCodes(petstore, ["/pets", "get"], ["200"]);
  const responses = rc.paths["/pets"] && rc.paths["/pets"].get && rc.paths["/pets"].get.responses || {};
  expect(Object.keys(responses)).toEqual(["default"]);
  expect(responses.default).toEqual(petstore.paths["/pets"].get.responses.default);
});


test("removeCodes removes all codes", () => {
  const rc = removeCodes(petstore, ["/pets", "get"], ["200", "default"]);
  const responses = rc.paths["/pets"] && rc.paths["/pets"].get && rc.paths["/pets"].get.responses || {};
  expect(Object.keys(responses)).toEqual([]);
});

test("includeCodes includes 200", () => {
  const rc = includeCodes(petstore, ["/pets", "get"], ["200"]);
  const responses = rc.paths["/pets"] && rc.paths["/pets"].get && rc.paths["/pets"].get.responses || {};
  expect(Object.keys(responses)).toEqual(["200"]);
  expect(responses["200"]).toEqual(petstore.paths["/pets"].get.responses["200"]);
});


test("includeCodes includes all codes", () => {
  const rc = includeCodes(petstore, ["/pets", "get"], ["200", "default"]);
  const responses = rc.paths["/pets"] && rc.paths["/pets"].get && rc.paths["/pets"].get.responses || {};
  expect(Object.keys(responses)).toEqual(["200", "default"]);
});