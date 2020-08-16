import React from 'react';
import styled from 'styled-components';
import cx from 'classnames';
import { format } from 'date-fns';
import { Filter } from 'react-feather';

const MailUIWrapper = styled.div.attrs({
  className: 'border-b',
})`
  height: inherit;
`;

const MailSearchResults = styled.div.attrs({
  className: '',
})`
  height: inherit;
`;

const Nav = styled.nav.attrs({
  className: '',
})`
  height: 100%;
  overflow-y: scroll;
`;

const EmailResultsNav = ({
  isLoading,
  isServiceIdFetched,
  searchResults,
  matchedSearchResults,
  selectedSearchResultIndex,
  handleClickEmailSubject,
  handleFilterEmailsBySender,
  handleFilterEmailsBySubject,
}) => (
  <Nav>
    <MailUIWrapper>
      {isLoading ? (
        <div className="p-2">Fetching emails from your account...</div>
      ) : null}
      {searchResults.length ? (
        <MailSearchResults>
          {searchResults.map((resultItem, idx) => (
            <div
              className={cx('py-2 px-2', {
                'bg-yellow-100': matchedSearchResults.includes(idx),
                'bg-yellow-200': selectedSearchResultIndex === idx,
                'cursor-pointer': selectedSearchResultIndex !== idx,
                'border-b border-solid py-2 px-2 rounded':
                  idx < searchResults.length - 1,
              })}
              key={`result${idx}`}
              onClick={(e) => {
                e.preventDefault();
                handleClickEmailSubject(idx);
              }}
            >
              <div className="flex items-top justify-between">
                <div className="text-gray-700 font-bold text-sm w-100">
                  {resultItem.from}
                </div>
                {!isServiceIdFetched && selectedSearchResultIndex === idx ? (
                  <button
                    type="button"
                    title="New search with this sender email"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFilterEmailsBySender(resultItem.from);
                    }}
                  >
                    <Filter size={16} color="orange" />
                  </button>
                ) : (
                  <div className="w-4">&nbsp;</div>
                )}
              </div>
              <div className="flex items-top justify-between">
                <div className="text-m">{resultItem.subject}</div>
                {!isServiceIdFetched && selectedSearchResultIndex === idx ? (
                  <button
                    type="button"
                    title="New search with this sender email and subject"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFilterEmailsBySubject({
                        fromEmail: resultItem.from,
                        subject: resultItem.subject,
                      });
                    }}
                    style={{ display: 'flex' }}
                  >
                    <Filter size={16} color="orange" />
                    <Filter
                      size={16}
                      color="orange"
                      style={{ marginLeft: '-13px' }}
                    />
                  </button>
                ) : (
                  <div className="w-4">&nbsp;</div>
                )}
              </div>
              <div className="text-gray-500 text-sm">
                {format(new Date(resultItem.date), 'dd MMM yyyy hh:mma')}
              </div>
            </div>
          ))}
        </MailSearchResults>
      ) : null}
    </MailUIWrapper>
  </Nav>
);

export default EmailResultsNav;
