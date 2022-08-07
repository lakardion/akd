import { useCallback, useState } from 'react';

export const useCRUDState = () => {
  const [currentId, setCurrentId] = useState('');
  const [showCreateEdit, setShowCreateEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const handleCreate = () => {
    setShowCreateEdit(true);
  };

  const handleFinished = useCallback(() => {
    setCurrentId('');
    setShowCreateEdit(false);
    setShowDeleteConfirm(false);
  }, []);

  const handleDelete = useCallback((id: string) => {
    setShowDeleteConfirm(true);
    setCurrentId(id);
  }, []);

  const handleEdit = useCallback((id?: string) => {
    id && setCurrentId(id);
    setShowCreateEdit(true);
  }, []);

  return {
    handleFinished,
    handleDelete,
    handleCreate,
    handleEdit,
    currentId,
    showCreateEdit,
    showDeleteConfirm,
  };
};
