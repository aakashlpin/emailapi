/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import styled from 'styled-components';
import { toArray } from '../../../src/pdf/utils';

const StyledGrid = styled.div`
  display: grid;
  grid-template-columns: ${(props) => `repeat(${props.cols}, 1fr)`};
  border: 1px solid #ddd;
  overflow-x: scroll;
  font-size: 0.8rem;
  max-width: calc(50vw - 4rem - 1rem);
`;

const GridRowBaseCell = styled.div.attrs((props) => ({
  className: props.selected ? 'bg-orange-100' : null,
}))`
  border-bottom: 1px solid #ddd;
  border-right: 1px solid #ddd;
  padding: 2px 4px;
`;

const GridRowClickableCell = styled(GridRowBaseCell)`
  cursor: pointer;
  &:hover {
    background: orange;
    border: 1px solid orange;
    color: #281a01;
  }
`;

const GridCell = ({ isCellClickable, ...props }) =>
  isCellClickable ? (
    <GridRowClickableCell isCellClickable={isCellClickable} {...props} />
  ) : (
    <GridRowBaseCell isCellClickable={isCellClickable} {...props} />
  );

export default function Grid({
  data,
  isCellClickable = false,
  cellClickCb = () => {},
  className = '',
  selectedRows = [],
  selectedCells = [],
}) {
  if (!data) {
    return <p>Glitch!</p>;
  }
  console.log({ selectedRows });
  return (
    <StyledGrid className={className} cols={toArray(data[0]).length}>
      {data.map((row, rowIdx) => {
        const cells = toArray(row);
        return (
          <>
            {cells.map((cell, colIdx) => (
              <GridCell
                key={`${rowIdx}_${colIdx}`}
                isCellClickable={isCellClickable}
                selected={
                  selectedRows.includes(rowIdx) ||
                  selectedCells.find(
                    (selectedCell) =>
                      selectedCell.rowIdx === rowIdx &&
                      selectedCell.colIdx === colIdx,
                  )
                }
                onClick={() =>
                  isCellClickable
                    ? cellClickCb({ value: cell, rowIdx, colIdx })
                    : null
                }
              >
                {cell}
              </GridCell>
            ))}
          </>
        );
      })}
    </StyledGrid>
  );
}
