// Wait until the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    fetchParcels();
    setupSocket();
  });
  
  // Set up Socket.IO for live updates
  function setupSocket() {
    const socket = io();
  
    // Listen for 'parcelData' event from the server
    socket.on('parcelData', data => {
      updateLiveData(data);
    });
  }
  
  function updateLiveData(data) {
    // Update live data on the page
    document.getElementById('length').textContent = data.length_cm || '--';
    document.getElementById('width').textContent = data.width_cm || '--';
    document.getElementById('height').textContent = data.height_cm || '--';
    document.getElementById('volume').textContent = data.volume_cm3 || '--';
    document.getElementById('weight').textContent = data.weight_grams || '--';
    document.getElementById('price').textContent = data.price || '--';
  }
  
  function fetchParcels() {
    fetch('http://localhost:3000/api/parcels')
      .then(response => response.json())
      .then(data => {
        displayParcels(data);
      })
      .catch(error => {
        console.error('Error fetching parcels:', error);
        const table = document.getElementById('parcelTable');
        table.innerHTML = `<tr><td colspan="6">Failed to load data</td></tr>`;
      });
  }
  
  function displayParcels(parcels) {
    const table = document.getElementById('parcelTable');
    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = ''; // Clear any existing content
  
    // Add rows from the data
    parcels.forEach(parcel => {
      const row = `
        <tr>
          <td>${parcel.id}</td>
          <td>${parcel.length_cm}</td>
          <td>${parcel.width_cm}</td>
          <td>${parcel.height_cm}</td>
          <td>${parcel.volume_cm3}</td>
          <td>${parcel.weight_grams}</td>
          <td>${parcel.price}</td>
          <td>${new Date(parcel.created_at).toLocaleString()}</td>
        </tr>
      `;
      tableBody.innerHTML += row;
    });
  }
  