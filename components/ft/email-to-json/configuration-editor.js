import React from 'react';
import styled from 'styled-components';
import generateKeyFromName from '~/src/ft/email-to-json/generateKeyFromName';
import { Label } from '~/components/common/Atoms';

const Container = styled.div``;

const FieldItem = styled.div.attrs({
  className: '',
})`
  padding: 1rem;
  border-bottom: 1px solid hsl(60, 69%, 79%);
`;

const Actions = styled.div`
  display: grid;
  grid-template-columns: 50% 50%;
`;

const ExtractedValue = styled.div.attrs({
  className: 'text-xl',
})`
  max-width: 90%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const NameInput = styled.input.attrs({
  className: 'border border-solid rounded border-gray-200 w-full',
})``;

const NameInputForm = styled.form`
  display: grid;
  grid-template-columns: 200px 1fr;
  grid-template-rows: 1fr;
  width: 100%;
`;

const ConfigurationEditor = ({
  configuration,
  onChangeConfiguration,
  sampleData,
  localFieldNames,
  setLocalFieldName,
}) => {
  function handleAssignNameForSelector(value, fieldKey) {
    onChangeConfiguration({
      ...configuration,
      fields: configuration.fields.map((field) =>
        field && field.fieldKey === fieldKey
          ? {
              ...field,
              fieldName: value,
              fieldKey: generateKeyFromName(value),
            }
          : field,
      ),
    });
  }

  function handleAssignFormatterOnValue(formatter, fieldKey) {
    onChangeConfiguration(
      {
        ...configuration,
        fields: configuration.fields.map((field) =>
          field && field.fieldKey === fieldKey
            ? {
                ...field,
                formatter,
              }
            : field,
        ),
      },
      true,
    );
  }

  function onChangeFieldName({ value, fieldKey }) {
    setLocalFieldName({
      ...localFieldNames,
      [fieldKey]: value,
    });
  }

  function onSaveFieldName(fieldKey) {
    const updatedFieldName = localFieldNames[fieldKey];
    handleAssignNameForSelector(updatedFieldName, fieldKey);
  }

  return (
    <Container>
      {configuration.fields
        .filter((field) => field)
        .map((field) => {
          const { fieldKey, fieldName } = field;
          const hasLocalName = typeof localFieldNames[fieldKey] === 'string';
          return (
            <FieldItem key={`editor_${fieldKey}`}>
              <div>
                <Label>Extracted Value</Label>
                <ExtractedValue>{sampleData[fieldKey]}</ExtractedValue>
              </div>
              <Actions>
                <div>
                  <Label>Name</Label>
                  <NameInputForm
                    onSubmit={(e) => {
                      e.preventDefault();
                      onSaveFieldName(fieldKey);
                    }}
                  >
                    <NameInput
                      value={
                        hasLocalName ? localFieldNames[fieldKey] : fieldName
                      }
                      onChange={(e) =>
                        onChangeFieldName({
                          value: e.target.value,
                          fieldKey,
                        })
                      }
                      onBlur={() => onSaveFieldName(fieldKey)}
                    />
                  </NameInputForm>
                </div>
                <div>
                  <Label>Format Extracted Value</Label>
                  <select
                    value={field.formatter}
                    onChange={(e) =>
                      handleAssignFormatterOnValue(e.target.value, fieldKey)
                    }
                  >
                    <option value="">None</option>
                    <option value="number">Extract Numbers</option>
                  </select>
                </div>
              </Actions>
            </FieldItem>
          );
        })}
    </Container>
  );
};

export default ConfigurationEditor;
