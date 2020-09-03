import styled from 'styled-components';

export const Shadow = styled.a.attrs({
  className: 'inline-block uppercase text-gray-800 py-1 px-4 text-sm',
})`
  background-color: hsl(228, 100%, 92%);
  box-shadow: 4px 4px hsla(228, 100%, 92%, 0.8);
  cursor: pointer;
`;

export const Separator = styled.div`
  background-image: url(/static/images/progressive-disclosure-line@2x.png);
  background-repeat: repeat-x;
  background-position: 0;
  background-size: 32px;
  height: 12px;
`;

export const VisibilityIcon = styled.span.attrs({
  className: 'inline-block mr-1',
})`
  vertical-align: bottom;
`;

export const StockItemContainer = styled.div`
  padding: 12px 24px 16px;
  background: ${(props) =>
    props.isSelected ? 'hsla(219, 79%, 66%, 1)' : 'hsla(189, 50%, 95%, 1)'};
  border: 1px solid hsla(214, 34%, 82%, 0.15);
  box-shadow: 0 4px 0px hsl(214, 34%, 82%);
  border-radius: 4px;
  cursor: ${(props) => (props.isActionable ? 'pointer' : 'initial')};
`;

export const StockItemBadge = styled.span`
  background: hsl(0, 0%, 86%);
  border-radius: 4px;
  padding: 2px 4px;
  text-align: center;
  color: hsl(0, 0%, 17%);
  border: 1px dashed hsl(0, 0%, 60%);
`;

export const Anchor = styled.a`
  border-bottom: 5px solid #ffc107;
`;

export const Button = styled.button.attrs((props) => ({
  type: props.type || 'button',
}))`
  border-bottom: 5px solid #ffc107;
  opacity: ${(props) => (props.disabled ? 0.25 : 1)};
  cursor: ${(props) => (props.disabled ? 'not-allowed' : 'pointer')};

  &:focus {
    outline: none;
  }
`;

export const Label = styled.div.attrs({
  className: 'uppercase text-gray-800 tracking-wide text-sm',
})``;

export const Value = styled.span``;

export const FlexEnds = styled.div.attrs({
  className: 'flex flex-1 w-full items-center justify-between',
})``;

export const Row = styled.div.attrs({
  className: 'flex items-center',
})`
  > * {
    margin-right: 4px;
  }
`;
