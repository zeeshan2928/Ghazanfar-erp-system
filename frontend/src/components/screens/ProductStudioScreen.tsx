import React, { useEffect, useRef, useState } from 'react';
import { apiClient, API_BASE_URL } from '../../services/api';

// Product Studio: manage a gallery of images/videos per product. Files are
// stored on local disk today (served over /uploads - see
// MediaStorageService on the backend); the API is designed so a real cloud
// storage backend can replace that later without any change here.

interface Product {
  id: number;
  name: string;
  code: string;
}

interface ProductMedia {
  id: number;
  productId: number;
  url: string;
  mediaType: 'IMAGE' | 'VIDEO';
  mimeType: string;
  isPrimary: boolean;
  createdAt: string;
}

export function ProductStudioScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number | ''>('');
  const [media, setMedia] = useState<ProductMedia[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (selectedProductId) loadMedia(selectedProductId as number);
    else setMedia([]);
  }, [selectedProductId]);

  async function loadProducts() {
    try {
      const result = await apiClient.searchProducts({ skip: 0, take: 500 });
      setProducts(result.data || []);
    } catch (err) {
      console.error('Failed to load products', err);
    }
  }

  async function loadMedia(productId: number) {
    setLoadingMedia(true);
    try {
      const result = await apiClient.getProductMedia(productId);
      setMedia(result);
    } catch (err) {
      console.error('Failed to load product media', err);
      setMedia([]);
    } finally {
      setLoadingMedia(false);
    }
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !selectedProductId) return;

    setUploading(true);
    setError('');
    try {
      await apiClient.uploadProductMedia(selectedProductId as number, file);
      await loadMedia(selectedProductId as number);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to upload media');
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(mediaId: number) {
    if (!selectedProductId) return;
    if (!confirm('Delete this media file?')) return;
    try {
      await apiClient.deleteProductMedia(selectedProductId as number, mediaId);
      await loadMedia(selectedProductId as number);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete media');
    }
  }

  async function handleSetPrimary(mediaId: number) {
    if (!selectedProductId) return;
    try {
      await apiClient.setPrimaryProductMedia(selectedProductId as number, mediaId);
      await loadMedia(selectedProductId as number);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to set primary media');
    }
  }

  return (
    <div style={styles.container}>
      <h2>Product Studio</h2>
      <p style={styles.subtitle}>Manage images and videos for a product's full detail page.</p>

      <div style={styles.field}>
        <label style={styles.label}>Product</label>
        <select
          style={styles.input}
          value={selectedProductId}
          onChange={e => setSelectedProductId(e.target.value ? parseInt(e.target.value, 10) : '')}
        >
          <option value="">Select product...</option>
          {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
        </select>
      </div>

      {selectedProductId && (
        <div style={styles.uploadRow}>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp,video/mp4" onChange={handleFileSelected} disabled={uploading} />
          {uploading && <span>Uploading...</span>}
        </div>
      )}

      {error && <div style={styles.errorBanner}>{error}</div>}

      {loadingMedia ? (
        <p>Loading media...</p>
      ) : (
        <div style={styles.grid}>
          {media.map(m => (
            <div key={m.id} style={styles.mediaCard}>
              {m.mediaType === 'IMAGE' ? (
                <img src={`${API_BASE_URL}${m.url}`} alt="" style={styles.mediaThumb} />
              ) : (
                <video src={`${API_BASE_URL}${m.url}`} style={styles.mediaThumb} controls />
              )}
              <div style={styles.mediaActions}>
                {m.isPrimary ? (
                  <span style={styles.primaryBadge}>Primary</span>
                ) : (
                  <button style={styles.smallBtn} onClick={() => handleSetPrimary(m.id)}>Set Primary</button>
                )}
                <button style={styles.smallBtn} onClick={() => handleDelete(m.id)}>Delete</button>
              </div>
            </div>
          ))}
          {selectedProductId && media.length === 0 && <p>No media yet for this product.</p>}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: '20px' },
  subtitle: { color: '#666', marginTop: '-8px' },
  field: { display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '400px', marginBottom: '16px' },
  label: { fontSize: '13px', fontWeight: 600, color: '#444' },
  input: { padding: '8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '14px' },
  uploadRow: { marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' },
  errorBanner: { background: '#f8d7da', color: '#721c24', padding: '10px', borderRadius: '4px', marginBottom: '12px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' },
  mediaCard: { border: '1px solid #ddd', borderRadius: '8px', padding: '10px', textAlign: 'center' },
  mediaThumb: { width: '100%', height: '150px', objectFit: 'cover', borderRadius: '4px' },
  mediaActions: { display: 'flex', justifyContent: 'space-between', marginTop: '8px', alignItems: 'center' },
  primaryBadge: { background: '#e6f4ea', color: '#1e7e34', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 },
  smallBtn: { background: '#eee', border: '1px solid #ccc', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '12px' },
};
