import { useState, useEffect } from 'react';
import { mycologyService } from '../services/mycologyService.js';
import ObservationCard from '../components/ObservationCard.jsx';
import { Plus, MapPin, Camera, Lock, Unlock, Check, RefreshCw, X, Calendar } from 'lucide-react';

export default function FieldJournalScreen({ onNavigate }) {
  const [observations, setObservations] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);

  // Form State
  const [formLocation, setFormLocation] = useState('');
  const [formLat, setFormLat] = useState('');
  const [formLng, setFormLng] = useState('');
  const [formEntryId, setFormEntryId] = useState('');
  const [formConfidence, setFormConfidence] = useState('possible');
  const [formNotes, setFormNotes] = useState('');
  const [formWeather, setFormWeather] = useState('');
  const [formHabitat, setFormHabitat] = useState('');
  const [formTrees, setFormTrees] = useState('');
  const [formIsPrivate, setFormIsPrivate] = useState(true); // Default PRIVATE
  const [formPhotoUrl, setFormPhotoUrl] = useState('');
  const [formPhotoAngle, setFormPhotoAngle] = useState('underside');

  const loadData = async () => {
    setLoading(true);
    const [obsList, speciesList] = await Promise.all([
      mycologyService.fetchObservations(),
      mycologyService.fetchEntries()
    ]);
    setObservations(obsList);
    setEntries(speciesList);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDetectGPS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setFormLat(pos.coords.latitude.toFixed(6));
          setFormLng(pos.coords.longitude.toFixed(6));
          setFormLocation(`GPS ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
        },
        (err) => {
          alert('GPS acquisition failed: ' + err.message);
        }
      );
    }
  };

  const handleSaveObservation = async (e) => {
    e.preventDefault();
    const newObs = {
      id: `obs_${Date.now()}`,
      date: new Date().toISOString(),
      locationName: formLocation || 'Field Observation',
      latitude: formLat ? parseFloat(formLat) : null,
      longitude: formLng ? parseFloat(formLng) : null,
      entryId: formEntryId || null,
      confidence: formConfidence,
      notes: formNotes,
      weather: formWeather,
      habitat: formHabitat,
      treesNearby: formTrees,
      isPrivate: formIsPrivate,
      photos: formPhotoUrl ? [{ url: formPhotoUrl, angle: formPhotoAngle, quality: 'good', verified: true }] : []
    };

    await mycologyService.saveObservation(newObs);
    setShowNewModal(false);
    resetForm();
    await loadData();
  };

  const handleDeleteObservation = async (id) => {
    if (window.confirm('Are you sure you want to delete this field observation?')) {
      await mycologyService.deleteObservation(id);
      await loadData();
    }
  };

  const resetForm = () => {
    setFormLocation('');
    setFormLat('');
    setFormLng('');
    setFormEntryId('');
    setFormConfidence('possible');
    setFormNotes('');
    setFormWeather('');
    setFormHabitat('');
    setFormTrees('');
    setFormIsPrivate(true);
    setFormPhotoUrl('');
  };

  return (
    <div className="mycology-journal-screen">
      <div className="mycology-journal-header">
        <div>
          <h2>Field Journal Observations Log</h2>
          <p>Record private wild fungal observations with GPS coordinates, weather notes, and photo angle tags.</p>
        </div>

        <button className="mycology-btn-primary" onClick={() => setShowNewModal(true)}>
          <Plus size={16} /> Record Observation
        </button>
      </div>

      {/* Observations Grid */}
      {loading ? (
        <div className="mycology-loading">
          <RefreshCw size={24} className="spin" />
          <p>Loading Journal Logs...</p>
        </div>
      ) : observations.length === 0 ? (
        <div className="mycology-empty-box">
          <p>Your field journal is empty. Click 'Record Observation' to log your first finding.</p>
        </div>
      ) : (
        <div className="mycology-grid-3">
          {observations.map(obs => (
            <ObservationCard 
              key={obs.id} 
              observation={obs} 
              onDelete={handleDeleteObservation}
            />
          ))}
        </div>
      )}

      {/* Record Observation Modal */}
      {showNewModal && (
        <div className="mycology-modal-backdrop">
          <div className="mycology-modal-card">
            <div className="mycology-modal-header">
              <h3>Record Field Observation</h3>
              <button className="mycology-modal-close-btn" onClick={() => setShowNewModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveObservation} className="mycology-form">
              <div className="mycology-form-row">
                <div className="mycology-form-group">
                  <label>Linked Species (Optional)</label>
                  <select value={formEntryId} onChange={(e) => setFormEntryId(e.target.value)}>
                    <option value="">-- Unidentified / General --</option>
                    {entries.map(e => (
                      <option key={e.id} value={e.id}>{e.title} ({e.scientificName})</option>
                    ))}
                  </select>
                </div>

                <div className="mycology-form-group">
                  <label>Identification Confidence</label>
                  <select value={formConfidence} onChange={(e) => setFormConfidence(e.target.value)}>
                    <option value="unidentified">Unidentified</option>
                    <option value="possible">Possible</option>
                    <option value="probable">Probable</option>
                    <option value="confirmed">Confirmed</option>
                  </select>
                </div>
              </div>

              <div className="mycology-form-row">
                <div className="mycology-form-group">
                  <label>Location Name / Description</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Gatineau Park, Trail 3" 
                    value={formLocation} 
                    onChange={(e) => setFormLocation(e.target.value)} 
                  />
                </div>

                <div className="mycology-form-group">
                  <label>GPS Coordinates</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input 
                      type="text" 
                      placeholder="Lat, Lng" 
                      value={formLat && formLng ? `${formLat}, ${formLng}` : ''} 
                      readOnly 
                    />
                    <button type="button" className="mycology-btn-secondary" onClick={handleDetectGPS} title="Auto-detect GPS">
                      <MapPin size={16} /> GPS
                    </button>
                  </div>
                </div>
              </div>

              <div className="mycology-form-row">
                <div className="mycology-form-group">
                  <label>Photo URL / File Path</label>
                  <input 
                    type="text" 
                    placeholder="/materials/mycology/photo.jpg" 
                    value={formPhotoUrl} 
                    onChange={(e) => setFormPhotoUrl(e.target.value)} 
                  />
                </div>

                <div className="mycology-form-group">
                  <label>Photo Angle Tag</label>
                  <select value={formPhotoAngle} onChange={(e) => setFormPhotoAngle(e.target.value)}>
                    <option value="top">Top (Cap Surface)</option>
                    <option value="side">Side (Full Profile)</option>
                    <option value="underside">Underside (Gills/Pores/Teeth)</option>
                    <option value="spore_print">Spore Print</option>
                    <option value="habitat">Habitat / Host Tree</option>
                  </select>
                </div>
              </div>

              <div className="mycology-form-row">
                <div className="mycology-form-group">
                  <label>Weather & Temperature</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 18°C, Cool, humid after rain" 
                    value={formWeather} 
                    onChange={(e) => setFormWeather(e.target.value)} 
                  />
                </div>

                <div className="mycology-form-group">
                  <label>Nearby Host Trees</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Mature Oak, Sugar Maple" 
                    value={formTrees} 
                    onChange={(e) => setFormTrees(e.target.value)} 
                  />
                </div>
              </div>

              <div className="mycology-form-group">
                <label>Field Notes & Observations</label>
                <textarea 
                  rows={3} 
                  placeholder="Describe cap texture, smell, flesh color change, stem ring, etc." 
                  value={formNotes} 
                  onChange={(e) => setFormNotes(e.target.value)}
                />
              </div>

              <div className="mycology-form-group mycology-checkbox-group">
                <label className="mycology-checkbox-label">
                  <input 
                    type="checkbox" 
                    checked={formIsPrivate} 
                    onChange={(e) => setFormIsPrivate(e.target.checked)} 
                  />
                  <span>Private Observation (Coordinates kept strictly local)</span>
                </label>
              </div>

              <div className="mycology-modal-actions">
                <button type="button" className="mycology-btn-secondary" onClick={() => setShowNewModal(false)}>Cancel</button>
                <button type="submit" className="mycology-btn-primary">Save Journal Entry</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
