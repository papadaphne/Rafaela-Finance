function loadStaffAccounts() {
    staffList.innerHTML = '<p style="text-align: center; color: var(--gray);">Memuat data staff...</p>';
    dashboardStaffList.innerHTML = '<p style="text-align: center; color: var(--gray);">Memuat data staff...</p>';

    db.collection('staff').get()
        .then((querySnapshot) => {
            staffList.innerHTML = '';
            dashboardStaffList.innerHTML = '';

            if (querySnapshot.empty) {
                staffList.innerHTML = '<p style="text-align: center; color: var(--gray);">Tidak ada staff terdaftar.</p>';
                dashboardStaffList.innerHTML = '<p style="text-align: center; color: var(--gray);">Tidak ada staff terdaftar.</p>';
                return;
            }

            querySnapshot.forEach((doc) => {
                const staffData = doc.data();
                const staffItem = document.createElement('div');
                staffItem.className = 'staff-item';
                staffItem.innerHTML = `
                    <div class="staff-info">
                        <div class="staff-name">${staffData.name}</div>
                        <div class="staff-email">${staffData.email}</div>
                    </div>
                    <button class="delete-btn" data-id="${doc.id}">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                `;
                staffList.appendChild(staffItem.cloneNode(true));
                dashboardStaffList.appendChild(staffItem);
            });

            // Tambahkan event listener untuk tombol hapus
            const deleteButtons = document.querySelectorAll('.delete-btn');
            deleteButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    const staffId = e.currentTarget.getAttribute('data-id');
                    deleteStaffAccount(staffId);
                });
            });
        })
        .catch((error) => {
            const errorMsg = `Error memuat data: ${error.message}. Pastikan aturan keamanan Firestore sudah diatur dengan benar.`;
            staffList.innerHTML = `<p style="text-align: center; color: var(--danger);">${errorMsg}</p>`;
            dashboardStaffList.innerHTML = `<p style="text-align: center; color: var(--danger);">${errorMsg}</p>`;
            
            // Juga tampilkan alert error
            showError('Tidak dapat memuat data staff. Periksa aturan keamanan Firestore.');
        });
}
