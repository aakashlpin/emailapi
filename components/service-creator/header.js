import React from 'react';
import styled from 'styled-components';
import CommonHeader from '~/components/common/common-header';

const InputSearch = styled.input.attrs({
  className: 'w-full px-4 py-2 border border-gray-400 border-solid rounded',
})`
  opacity: ${(props) => (props.disabled ? 0.4 : 1)};
`;

const Header = ({
  serviceId,
  searchInput,
  setTriggerSearch,
  isLoading,
  isServiceIdFetched,
  handleChangeSearchInput,
}) => (
  <CommonHeader>
    {serviceId ? (
      searchInput ? (
        <div className="text-center">&ldquo;{searchInput}&rdquo;</div>
      ) : null
    ) : (
      <form
        className="w-full"
        onSubmit={(e) => {
          e.preventDefault();
          setTriggerSearch(true);
        }}
      >
        <InputSearch
          type="search"
          disabled={isLoading || isServiceIdFetched}
          value={searchInput}
          onChange={(e) => handleChangeSearchInput(e.target.value)}
          placeholder="Search query from Google..."
        />
      </form>
    )}
  </CommonHeader>
);

export default Header;
