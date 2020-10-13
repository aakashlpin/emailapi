import React from 'react';
import styled from 'styled-components';
import { toArray } from '../../../src/pdf/utils';

const StyledGrid = styled.div`
  display: grid;
  grid-template-columns: ${(props) => `repeat(${props.cols}, 1fr)`};
  border: 1px solid #ddd;
  overflow-x: scroll;
  font-size: 0.8rem;
  max-width: 900px;
`;

const GridRowCell = styled.div`
  border-bottom: 1px solid #ddd;
  border-right: 1px solid #ddd;
  padding: 2px 4px;
`;

export default function Grid({ data }) {
  if (!data) {
    return <p>Glitch!</p>;
  }
  return (
    <StyledGrid cols={toArray(data[0]).length}>
      {data.map((row) => {
        const cells = toArray(row);
        return (
          <>
            {cells.map((cell) => (
              <GridRowCell>{cell}</GridRowCell>
            ))}
          </>
        );
      })}
    </StyledGrid>
  );
}
