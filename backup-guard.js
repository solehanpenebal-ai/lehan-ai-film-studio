/* Backup Integrity Guard — additive safety layer; keeps schemaVersion 2 compatible. */
(() => {
  const countState = value => {
    const projects = Array.isArray(value?.projects) ? value.projects : [];
    return {
      projects: projects.length,
      characters: projects.reduce((n, p) => n + (Array.isArray(p.characters) ? p.characters.length : 0), 0),
      clips: projects.reduce((n, p) => n + (Array.isArray(p.clips) ? p.clips.length : 0), 0),
      imageReferences: projects.reduce((n, p) => n + (p.characters || []).reduce((m, c) =>
        m + ['referenceImage', 'referenceFront', 'referenceSide', 'referenceFullBody']
          .filter(k => typeof c[k] === 'string' && c[k].startsWith('data:image/')).length, 0), 0)
    };
  };

  const sameCounts = (a, b) =>
    a.projects === b.projects && a.characters === b.characters && a.clips === b.clips;

  const button = document.getElementById('backupBtn');
  if (!button) return;

  // Capture phase prevents the older unverified export handler from firing as well.
  button.addEventListener('click', event => {
    event.preventDefault();
    event.stopImmediatePropagation();

    try {
      const current = { projects: state.projects };
      const currentCounts = countState(current);
      let storedCounts = null;
      let storedStateReadable = true;

      try {
        const raw = localStorage.getItem(KEY);
        if (raw) storedCounts = countState(JSON.parse(raw));
      } catch (_) {
        storedStateReadable = false;
      }

      const warnings = [];
      if (currentCounts.clips === 0) warnings.push('Belum ada klip storyboard di data aktif.');
      if (currentCounts.clips === 1) warnings.push('Hanya ada 1 klip di data aktif. Jika seharusnya lebih banyak, backup ini tidak dapat memulihkan klip yang tidak ada.');
      if (!storedStateReadable) warnings.push('Data tersimpan di perangkat tidak dapat dibaca untuk dibandingkan.');
      else if (storedCounts && !sameCounts(currentCounts, storedCounts)) {
        warnings.push('Jumlah proyek/karakter/klip di memori berbeda dari data yang tersimpan. Periksa kemungkinan perubahan yang belum tersimpan.');
      }

      const summary = [
        'RINGKASAN BACKUP',
        'Proyek: ' + currentCounts.projects,
        'Karakter: ' + currentCounts.characters,
        'Klip storyboard: ' + currentCounts.clips,
        'Referensi gambar: ' + currentCounts.imageReferences,
        '',
        ...warnings.map(w => 'PERINGATAN: ' + w),
        '',
        'Backup akan berisi data aktif yang saat ini dibaca aplikasi. Lanjutkan?'
      ].join('\n');

      if (!window.confirm(summary)) return;

      const payload = {
        schemaVersion: 2,
        exportedAt: new Date().toISOString(),
        activeProjectId: state.activeProjectId,
        backupAudit: {
          counts: currentCounts,
          persistedCounts: storedCounts,
          warnings
        },
        projects: state.projects
      };

      const serialized = JSON.stringify(payload, null, 2);
      const verified = JSON.parse(serialized);
      const verifiedCounts = countState(verified);
      if (!sameCounts(currentCounts, verifiedCounts)) {
        throw new Error('Verifikasi internal backup gagal: jumlah data berubah saat serialisasi.');
      }

      const filename = 'lehan-ai-film-studio-workspace-backup.json';
      const anchor = document.createElement('a');
      const url = URL.createObjectURL(new Blob([serialized], { type: 'application/json' }));
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);

      if (typeof toast === 'function') {
        toast('Backup terverifikasi: ' + currentCounts.projects + ' proyek, ' +
          currentCounts.characters + ' karakter, ' + currentCounts.clips + ' klip.');
      }
    } catch (error) {
      if (typeof toast === 'function') toast('Backup gagal: ' + (error.message || 'kesalahan tidak diketahui'));
    }
  }, true);
})();
