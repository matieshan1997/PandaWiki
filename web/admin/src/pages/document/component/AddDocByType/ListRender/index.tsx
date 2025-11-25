import { ConstsCrawlerSource } from '@/request';
import { Box, List } from '@mui/material';
import { Fragment, useCallback } from 'react';
import { ListDataItem } from '..';
import { useGlobalQueue } from '../hooks/useGlobalQueue';
import BatchActionBar from './Action';
import ListRenderItem from './Item';

interface ListRenderProps {
  data: ListDataItem[];
  setData: React.Dispatch<React.SetStateAction<ListDataItem[]>>;
  checked: string[];
  setChecked: React.Dispatch<React.SetStateAction<string[]>>;
  parent_id: string | null;
  loading: boolean;
  type: ConstsCrawlerSource;
  isSupportSelect: boolean;
  queue: ReturnType<typeof useGlobalQueue>;
}

const ListRender = ({
  data,
  checked,
  setChecked,
  loading,
  setData,
  type,
  isSupportSelect,
  parent_id,
  queue,
}: ListRenderProps) => {
  const renderFolder = useCallback(
    (parendId: string | null, depth: number): React.ReactNode => {
      const filterCurData = data.filter(item => item.parent_id === parendId);
      return filterCurData.map(item => (
        <Fragment key={item.uuid}>
          <ListRenderItem
            data={item}
            depth={depth}
            isSupportSelect={isSupportSelect}
            checked={checked.includes(item.uuid)}
            setData={setData}
            setChecked={setChecked}
          />
          {!item.file && item.open && renderFolder(item.id || '', depth + 1)}
        </Fragment>
      ));
    },
    [data, checked, setChecked, setData, isSupportSelect],
  );

  return (
    <Box
      sx={{
        maxHeight: 'calc(100vh - 300px)',
        overflow: 'auto',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '10px',
      }}
    >
      <List dense sx={{ p: 0 }}>
        <BatchActionBar
          data={data}
          checked={checked}
          setChecked={setChecked}
          loading={loading}
          setData={setData}
          type={type}
          isSupportSelect={isSupportSelect}
          parent_id={parent_id}
          queue={queue}
        />
        {renderFolder(parent_id || '', 0)}
      </List>
    </Box>
  );
};

export default ListRender;
