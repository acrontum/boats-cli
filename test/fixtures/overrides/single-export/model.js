// @ts-check

/** @type{import('../../../../').CustomTemplates['getModel']} */
module.exports = (_globalOptions, _file) => {
  return `\
type: "object"
required:
  - "id"
  - "createdAt"
  - "updatedAt"
properties:
  id:
    type: "string"
    format: "uuid"
  createdAt:
    type: "string"
    format: "date-time"
  updatedAt:
    type: "string"
    format: "date-time"
  name:
    type: "string"
    description: "Name of the thing, separated by dashes (-)"
    example: "this-is-an-example"
    minLength: 1
    pattern: "\\\\S"
    nullable: true
`;
};
