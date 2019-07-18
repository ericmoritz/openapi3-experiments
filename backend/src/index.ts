import express from "express";
import OpenAPIBackend from "openapi-backend";
import types from "./types";
import uuidv4 from "uuid/v4";
import people = types.backend.people;

const openAPIJSON = __dirname + "/openapi.json";
const openAPIYAML = __dirname + "/openapi.yaml";

const port = 8080; // default port to listen

const data: { [key: string]: types.Person } = {
  "1": { kind: "Person", id: "1", name: "Eric" },
};

interface Service {
  listPeople(): Promise<people.listPeopleResponse>;
  createPerson(req: people.createPersonRequest): Promise<people.createPersonResponse>;
  getPerson(id: string): Promise<people.getPersonResponse | types.NotFound>;
}

const service: Service = {
  async listPeople(): Promise<people.listPeopleResponse> {
    return {
      kind: "ListPeopleSuccess",
      people: Object.values(data),
    };
  },

  async createPerson(req: people.createPersonRequest): Promise<people.createPersonResponse> {
    const person: types.Person = {
      kind: "Person",
      id: uuidv4(),
      name: req.name,
    };
    data[person.id] = person;
    return { kind: "Success" };
  },

  async getPerson(id: string): Promise<people.getPersonResponse | types.NotFound> {
    const person = data[id];
    if (!person) {
      const resp: types.NotFound = { kind: "NotFound" };
      return resp;
    }
    return { kind: "GetPersonSuccess", person };
  },
};
const api = new OpenAPIBackend({
  definition: openAPIJSON,
  handlers: {
    validationFail: (c, _req, res) => res.status(400).json({ err: c.validation.errors }),
    notFound: (_c, _req, res) => res.status(404).json({ err: "not found" }),
    listPeople: async (_c, _req, res) => {
      res.status(200).json(await service.listPeople());
    },
    createPerson: async (c, _req, res) =>
      res.status(200).json(await service.createPerson(c.request.requestBody)),
    getPerson: async (c, _req, res) =>
      res.status(200).json(await service.getPerson(c.request.params.personId as string)),
  },
});
api.init();

const app = express();
app.use(express.json());
app.use("/api/v1/openapi.json", express.static(openAPIJSON));
app.use("/api/v1/openapi.yaml", express.static(openAPIYAML));
app.use("/api/v1", express.static(__dirname + "/static/"));
app.use("/api/v1", (req, res) => api.handleRequest(req, req, res));

// start the Express server
app.listen(port, (): void => {
  console.log(`server started at http://localhost:${port}`);
});
