import React, { useState, useEffect } from 'react';
import { Plus, Filter, Search, Loader } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { 
  createMilestone, 
  updateMilestone, 
  deleteMilestone, 
  getAllMilestones
} from '../../services/milestoneService';
import { getAllProjects } from '../../services/projectService';
import MilestoneCard from '../common/MilestoneCard';
import MilestoneForm from './MilestoneForm';
import './MilestonesManager.css';

const MilestonesManager = () => {
  const [milestones, setMilestones] = useState([]);
  const [filteredMilestones, setFilteredMilestones] = useState([]);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState(null);
  const [filterClient, setFilterClient] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [milestones, filterClient, filterStatus, searchTerm]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load clients
      const usersRef = collection(db, 'users');
      const clientsQuery = query(
        usersRef,
        where('role', '==', 'client'),
        where('status', '==', 'approved')
      );
      const clientsSnapshot = await getDocs(clientsQuery);
      const clientsList = clientsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setClients(clientsList);

      // Load projects
      const projectsList = await getAllProjects();
      setProjects(projectsList);

      // Load milestones
      const milestonesList = await getAllMilestones();
      setMilestones(milestonesList);
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...milestones];

    // Filter by client
    if (filterClient !== 'all') {
      filtered = filtered.filter(m => m.clientId === filterClient);
    }

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(m => m.status === filterStatus);
    }

    // Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(m => 
        m.title.toLowerCase().includes(term) ||
        m.description?.toLowerCase().includes(term) ||
        m.clientName.toLowerCase().includes(term)
      );
    }

    setFilteredMilestones(filtered);
  };

  const handleCreateMilestone = async (milestoneData) => {
    const result = await createMilestone(milestoneData);
    if (result.success) {
      setShowForm(false);
      loadData();
    } else {
      alert('Error al crear milestone: ' + result.error);
    }
  };

  const handleUpdateMilestone = async (milestoneData) => {
    const result = await updateMilestone(editingMilestone.id, milestoneData);
    if (result.success) {
      setShowForm(false);
      setEditingMilestone(null);
      loadData();
    } else {
      alert('Error al actualizar milestone: ' + result.error);
    }
  };

  const handleEdit = (milestone) => {
    setEditingMilestone(milestone);
    setShowForm(true);
  };

  const handleDelete = async (milestoneId) => {
    if (!window.confirm('¿Estás seguro de eliminar este milestone?')) {
      return;
    }

    const result = await deleteMilestone(milestoneId);
    if (result.success) {
      loadData();
    } else {
      alert('Error al eliminar milestone: ' + result.error);
    }
  };

  const handleUpdateStatus = async (milestoneId, newStatus) => {
    const result = await updateMilestone(milestoneId, { status: newStatus });
    if (result.success) {
      loadData();
    } else {
      alert('Error al actualizar estado: ' + result.error);
    }
  };

  const getStats = () => {
    const total = milestones.length;
    const pending = milestones.filter(m => m.status === 'pending').length;
    const inProgress = milestones.filter(m => m.status === 'in_progress').length;
    const completed = milestones.filter(m => m.status === 'completed').length;

    return { total, pending, inProgress, completed };
  };

  const stats = getStats();

  if (loading) {
    return (
      <div className="milestones-loading">
        <Loader className="spinner" size={32} />
        <p>Cargando milestones...</p>
      </div>
    );
  }

  return (
    <div className="milestones-manager">
      <div className="milestones-header">
        <div>
          <h1>Gestión de Milestones</h1>
          <p>Gestiona los hitos de proyectos de tus clientes</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-create">
          <Plus size={20} />
          Nuevo Milestone
        </button>
      </div>

      {/* Stats */}
      <div className="milestones-stats">
        <div className="stat-card">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Total</div>
        </div>
        <div className="stat-card pending">
          <div className="stat-value">{stats.pending}</div>
          <div className="stat-label">Pendientes</div>
        </div>
        <div className="stat-card in-progress">
          <div className="stat-value">{stats.inProgress}</div>
          <div className="stat-label">En Progreso</div>
        </div>
        <div className="stat-card completed">
          <div className="stat-value">{stats.completed}</div>
          <div className="stat-label">Completados</div>
        </div>
      </div>

      {/* Filters */}
      <div className="milestones-filters">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Buscar milestones..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <Filter size={18} />
          <select value={filterClient} onChange={(e) => setFilterClient(e.target.value)}>
            <option value="all">Todos los clientes</option>
            {clients.map(client => (
              <option key={client.id} value={client.id}>
                {client.displayName || client.email}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">Todos los estados</option>
            <option value="pending">Pendientes</option>
            <option value="in_progress">En Progreso</option>
            <option value="completed">Completados</option>
          </select>
        </div>
      </div>

      {/* Milestones List */}
      <div className="milestones-list">
        {filteredMilestones.length === 0 ? (
          <div className="milestones-empty">
            <p>No hay milestones que coincidan con los filtros</p>
            {milestones.length === 0 && (
              <button onClick={() => setShowForm(true)} className="btn-create-empty">
                <Plus size={20} />
                Crear primer milestone
              </button>
            )}
          </div>
        ) : (
          filteredMilestones.map(milestone => (
            <MilestoneCard
              key={milestone.id}
              milestone={milestone}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onUpdateStatus={handleUpdateStatus}
              isAdmin={true}
            />
          ))
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <MilestoneForm
          milestone={editingMilestone}
          clients={clients}
          projects={projects}
          onSave={editingMilestone ? handleUpdateMilestone : handleCreateMilestone}
          onCancel={() => {
            setShowForm(false);
            setEditingMilestone(null);
          }}
        />
      )}
    </div>
  );
};

export default MilestonesManager;
