import type { HTTPStrategies } from "./types";

export const skipParsingFieldsFromResponse = () => Promise.resolve(null);

// TODO: Move these types (or this file?) into db-seafowl, since it's Seafowl-specific
type SeafowlArrowType =
  | {
      /* NOTE: CHAR and VARCHAR are indistinguishable from arrow type (Utf8 for both) */
      name: "utf8";
    }
  | {
      name: "int";
      bitWidth: 16 | 32 | 64;
      isSigned: true /* Seafowl has no unsigned ints */;
    }
  | {
      name: "floatingpoint";
      precision: "SINGLE" | "DOUBLE";
    }
  | { name: "bool" }
  | { name: "date"; unit: "DAY" }
  | { name: "timestamp"; unit: "NANOSECOND" };

type SeafowlSQLType =
  | "SMALLINT"
  | "INT"
  | "BIGINT"
  | "CHAR"
  | "VARCHAR"
  | "TEXT"
  | "FLOAT"
  | "REAL"
  | "DOUBLE"
  | "BOOLEAN"
  | "DATE"
  | "TIMESTAMP";

type SeafowlArrowField = {
  children: SeafowlArrowField[];
  name: string;
  nullable: boolean;
  type: SeafowlArrowType;
};

// const seafowlArrowTypeToSQLType = () => {};

const seafowlArrowTypeToSQLType = (
  arrowField: SeafowlArrowType
): SeafowlSQLType => {
  switch (arrowField.name) {
    case "utf8":
      // NOTE: Could be "CHAR". Arbitrary, not possible to ditinguish from arrow type
      return "VARCHAR";
    case "int":
      switch (arrowField.bitWidth) {
        case 16:
          return "SMALLINT";
        case 32:
          return "INT";
        case 64:
          return "BIGINT";
      }
    case "floatingpoint":
      switch (arrowField.precision) {
        case "SINGLE":
          // NOTE Could be "REAL". Arbitrary, not possible to ditinguish from arrow type
          return "FLOAT";
        case "DOUBLE":
          return "DOUBLE";
      }
    case "bool":
      return "BOOLEAN";
    case "date":
      return "DATE";
    case "timestamp":
      return "TIMESTAMP";
  }
};

const formatSqlType = ({
  sqlType,
  nullable,
}: {
  sqlType: SeafowlSQLType;
  nullable: boolean;
}) => {
  if (nullable) {
    return sqlType;
  } else {
    return sqlType + " NOT NULL";
  }
};

/**
 * Parse the fields from the content-type header, after extracting them in arrow format
 * and converting them to our format.
 *
 * @returns
 */
export const parseFieldsFromResponseContentTypeHeader: HTTPStrategies["parseFieldsFromResponse"] =
  async ({ response }) => {
    // TODO: type safety: This function is only returning non-arrow fields because tests use it as a mock
    //       but in reality it returns SeafowlArrowField[], so be accurate about that there
    const maybeArrowFields =
      await parseArrowFieldsFromResponseContentTypeHeader({ response });
    const arrowFields = maybeArrowFields
      ? (maybeArrowFields as unknown as { fields: SeafowlArrowField[] }).fields
      : [];

    try {
      const fields = arrowFields.map((arrowField, index) => {
        const formattedType = formatSqlType({
          sqlType: seafowlArrowTypeToSQLType(arrowField.type),
          nullable: arrowField.nullable,
        });
        return {
          columnID: index,
          name: arrowField.name,
          format: formattedType,
          formattedType: formattedType,

          // Meaningless columns for context of Seafowl
          tableID: -1,
          dataTypeModifier: -1,
          dataTypeSize: -1,
          dataTypeID: -1,
        };
      });

      return fields;
    } catch (err) {
      console.warn("Failed parsing arrow fields to SQL fields:", err);
      return [];
    }
  };

/**
 * Parse the raw "arrow fields" from the response Content-Type header
 *
 * NOTE: This does not return fields in the expected shape, but it can
 * be used during testing to assert that the shape returned is as expected.
 *
 * For the exact shape, {@link parseFieldsFromResponseContentTypeHeader}
 */
export const parseArrowFieldsFromResponseContentTypeHeader: HTTPStrategies["parseFieldsFromResponse"] =
  async ({ response }) => {
    const headers = response.headers;
    const contentType = headers.get("Content-Type");

    if (!contentType) {
      return null;
    }

    try {
      /**
       *
       * application/json; arrow-schema=%7B%22blah%22%3A%22ok%22%7D
       *
       * NOTE: We assume that arrow-schema is the only parameter, and is
       * thus the last one, and so does not terminate with a semi-colon
       */
      const urlencodedJson = contentType
        .split("; arrow-schema=")
        .slice(1)
        .join("; arrow-schema="); // make sure to join it back in case the value itself happens to contain this string

      const decodedJson = decodeURIComponent(urlencodedJson);

      const arrowFields = JSON.parse(decodedJson);
      return arrowFields satisfies ReturnType<
        HTTPStrategies["parseFieldsFromResponse"]
      >;
    } catch (err) {
      console.warn("Failed to parse fields from Response Content-Type header");
      return null;
    }
  };
