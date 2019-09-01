import { removeCodes, includeCodes } from "../src";
import petstore from "./petstore";

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