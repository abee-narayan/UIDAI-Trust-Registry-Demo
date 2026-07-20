document.addEventListener('DOMContentLoaded', () => {
    const countrySelect = document.getElementById('countrySelect');
    const step1 = document.getElementById('step1');
    const step2 = document.getElementById('step2');
    const step3 = document.getElementById('step3');
    const loader = document.getElementById('loader');
    const qrContainer = document.getElementById('qrContainer');
    const resetBtn = document.getElementById('resetBtn');
    const qrInstructions = document.getElementById('qrInstructions');
    const trustId = document.getElementById('trustId');
    const qrImage = document.querySelector('.qr-image');

    // Handle Country Selection
    countrySelect.addEventListener('change', (e) => {
        const country = e.target.value;
        
        if (country === 'in') {
            qrInstructions.textContent = 'Scan with Aadhaar App or Google Wallet';
            trustId.textContent = 'TR-IND-84920-SG';
        } else if (country === 'sg') {
            qrInstructions.textContent = 'Scan with Singpass App';
            trustId.textContent = 'TR-SGP-11029-SG';
        } else {
            qrInstructions.textContent = 'Scan with your National Identity Wallet';
            trustId.textContent = 'TR-INT-00000-SG';
        }

        // Generate a new dummy QR code to make it look dynamic
        qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=openid4vp://request?relying_party=sg-hotel-001&country=${country}`;

        // Transition from Step 1 to Step 2 Loader
        step1.classList.add('hidden');
        step2.classList.remove('hidden');
        
        // Simulate API call to Trust Registry & QR Generation (2 seconds)
        setTimeout(() => {
            loader.classList.add('hidden');
            qrContainer.classList.remove('hidden');
        }, 2000);
    });

    // Reset Flow
    resetBtn.addEventListener('click', () => {
        step2.classList.add('hidden');
        qrContainer.classList.add('hidden');
        loader.classList.remove('hidden');
        
        step3.classList.add('hidden');
        
        step1.classList.remove('hidden');
        countrySelect.value = '';
    });

    // Simulate the user scanning the QR with their wallet
    // We make the QR code clickable for demo purposes to simulate the "callback" success
    qrImage.addEventListener('click', () => {
        // Stop the scanner line
        document.querySelector('.qr-scanner-line').style.display = 'none';
        
        // Show success
        setTimeout(() => {
            step2.classList.add('hidden');
            step3.classList.remove('hidden');
        }, 500); // Small delay for UX feel
    });
    
    // Add tooltip explaining the click to demo
    qrImage.title = "Click to simulate successful wallet scan & presentation";
    qrImage.style.cursor = "pointer";
});
