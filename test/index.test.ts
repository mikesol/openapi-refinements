import { removeCodes, includeCodes } from "../src";
import petstore from "./petstore";


test("removeCodes removes 200 and 201 everywhere", () => {
  const refined = removeCodes("/pets", ["200", "201"])(petstore);
  const refinedResponsesGet = refined.paths["/pets"] && refined.paths["/pets"].get && refined.paths["/pets"].get.responses || {};
  const refinedResponsesPost = refined.paths["/pets"] && refined.paths["/pets"].post && refined.paths["/pets"].post.responses || {};
  const responsesGet = petstore.paths["/pets"] && petstore.paths["/pets"].get && petstore.paths["/pets"].get.responses || {};
  const responsesPost = petstore.paths["/pets"] && petstore.paths["/pets"].post && petstore.paths["/pets"].post.responses || {};
  expect(Object.keys(refinedResponsesGet)).toEqual(["default"]);
  expect(refinedResponsesGet.default).toEqual(responsesGet.default);
  expect(Object.keys(refinedResponsesPost)).toEqual(["default"]);
  expect(refinedResponsesPost.default).toEqual(responsesPost.default);
});

test("removeCodes removes 200", () => {
  const refined = removeCodes(["/pets", "get"], ["200"])(petstore);
  const refinedResponses = refined.paths["/pets"] && refined.paths["/pets"].get && refined.paths["/pets"].get.responses || {};
  const resposnes = petstore.paths["/pets"] && petstore.paths["/pets"].get && petstore.paths["/pets"].get.responses || {};
  expect(Object.keys(refinedResponses)).toEqual(["default"]);
  expect(refinedResponses.default).toEqual(resposnes.default);
});


test("removeCodes removes all codes", () => {
  const refined = removeCodes(["/pets", "get"], ["200", "default"])(petstore);
  const refinedResponses = refined.paths["/pets"] && refined.paths["/pets"].get && refined.paths["/pets"].get.responses || {};
  expect(Object.keys(refinedResponses)).toEqual([]);
});

test("includeCodes includes 200", () => {
  const refined = includeCodes(["/pets", "get"], ["200"])(petstore);
  const responses = refined.paths["/pets"] && refined.paths["/pets"].get && refined.paths["/pets"].get.responses || {};
  const refinedResponses = petstore.paths["/pets"] && petstore.paths["/pets"].get && petstore.paths["/pets"].get.responses || {};
  expect(Object.keys(responses)).toEqual(["200"]);
  expect(refinedResponses["200"]).toEqual(responses["200"]);
});


test("includeCodes includes all codes", () => {
  const refined = includeCodes(["/pets", "get"], ["200", "default"])(petstore);
  const responses = refined.paths["/pets"] && refined.paths["/pets"].get && refined.paths["/pets"].get.responses || {};
  expect(Object.keys(responses)).toEqual(["200", "default"]);
});

test("everything is composeable", () => {
  const refined = [
    includeCodes(["/pets", "get"], ["200"]),
    removeCodes(["/pets", "post"], ["201"])
  ].reduce((a, b) => b(a), petstore);
  const refinedResponsesGet = refined.paths["/pets"] && refined.paths["/pets"].get && refined.paths["/pets"].get.responses || {};
  const refinedResponsesPost = refined.paths["/pets"] && refined.paths["/pets"].post && refined.paths["/pets"].post.responses || {};
  const responsesGet = petstore.paths["/pets"] && petstore.paths["/pets"].get && petstore.paths["/pets"].get.responses || {};
  const responsesPost = petstore.paths["/pets"] && petstore.paths["/pets"].post && petstore.paths["/pets"].post.responses || {};
  expect(Object.keys(refinedResponsesGet)).toEqual(["200"]);
  expect(refinedResponsesGet["200"]).toEqual(responsesGet["200"]);
  expect(Object.keys(refinedResponsesPost)).toEqual(["default"]);
  expect(refinedResponsesPost.default).toEqual(responsesPost.default);

});