const ACCESS_PASSWORD = 'HOLA';

function initAutocomplete() {
    const destinoInput = document.getElementById('destino');
    const hotelInput = document.getElementById('hotel');
    const destinoAutocomplete = new google.maps.places.Autocomplete(destinoInput, { types: ['(cities)'], fields: ['geometry'] });
    const hotelAutocomplete = new google.maps.places.Autocomplete(hotelInput, { types: ['establishment'], fields: ['name'] });
    destinoAutocomplete.addListener('place_changed', () => {
        const place = destinoAutocomplete.getPlace();
        if (place.geometry && place.geometry.viewport) { hotelAutocomplete.setBounds(place.geometry.viewport); }
    });
    hotelAutocomplete.addListener('place_changed', () => {
        const place = hotelAutocomplete.getPlace();
        if (place.name) { hotelInput.value = place.name; }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // --- 1. CONFIGURACIÓN CON TUS CLAVES ---
    // ===== CLAVES DE EMAILJS CORREGIDAS =====
    const EMAILJS_PUBLIC_KEY = 'uu13Uw2hqh0Y2eMy-'; // <-- ¡ESTA ERA LA CLAVE INCORRECTA! YA ESTÁ CORREGIDA.
    const EMAILJS_SERVICE_ID = 'service_62vzrtr';
    const EMAILJS_TEMPLATE_ID = 'template_envoogp';
    // ==========================================
    emailjs.init(EMAILJS_PUBLIC_KEY);
    const loginOverlay = document.getElementById('login-overlay');
    const loginForm = document.getElementById('login-form');
    const passwordInput = document.getElementById('password-input');
    const loginError = document.getElementById('login-error');
    const mainWrapper = document.querySelector('.wrapper');

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (passwordInput.value === ACCESS_PASSWORD) {
            loginOverlay.style.display = 'none';
            mainWrapper.style.display = 'block';
        } else {
            loginError.style.display = 'block';
            passwordInput.value = '';
        }
    });

    const firebaseConfig = {
      apiKey: "AIzaSyBeoG3uxq3f8wzQgEp0AkhnoWT1TVFLjJs",
      authDomain: "links-61279.firebaseapp.com",
      projectId: "links-61279",
      storageBucket: "links-61279.firebasestorage.app",
      messagingSenderId: "960181376002",
      appId: "1:960181376002:web:a4ff47407fabbe82b1c31b",
      measurementId: "G-PBJ2908N59"
    };
    firebase.initializeApp(firebaseConfig);
    const storage = firebase.storage();

    // --- 2. OBTENER ELEMENTOS DEL DOM ---
    const form = document.getElementById('pre-reserva-form');
    const formTitleSection = document.getElementById('form-title-section');
    const formSection = document.getElementById('form-section');
    const confirmationSection = document.getElementById('confirmation-section');
    const processBtn = document.getElementById('process-voucher-btn');
    const newVoucherBtn = document.getElementById('new-voucher-btn');
    const loaderOverlay = document.getElementById('loader-overlay');
    const loaderText = document.getElementById('loader-text');

    // --- 3. FUNCIONES AUXILIARES ---
    const toggleLoader = (show, text = "Generando PDF...") => {
        const loaderTextElement = document.getElementById('loader-text');
        if (loaderTextElement) {
            loaderTextElement.textContent = text;
        }
        const loaderOverlayElement = document.getElementById('loader-overlay');
        if(loaderOverlayElement) {
            loaderOverlayElement.style.display = show ? 'flex' : 'none';
        }
    };
    
    function formatDate(date) { return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }); }

    function formatCurrency(value, currency) {
        const number = parseFloat(String(value).replace(/[^0-9.-]+/g, ""));
        if (isNaN(number)) { return currency === 'COP' ? '$ 0 COP' : '$ 0.00 USD'; }
        const options = currency === 'COP' ? { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 } : { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 };
        return number.toLocaleString(currency === 'COP' ? 'es-CO' : 'en-US', options);
    }
    
    // --- FUNCIÓN PARA AÑADIR ENLACES AL PDF ---
    function addLinkToPDF(pdf, elementId, container, scaleFactor) {
        const element = document.getElementById(elementId);
        if (!element || !element.href) return;
        
        const rect = element.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        
        const x = (rect.left - containerRect.left) * scaleFactor;
        const y = (rect.top - containerRect.top) * scaleFactor;
        const w = rect.width * scaleFactor;
        const h = rect.height * scaleFactor;
        
        pdf.link(x, y, w, h, { url: element.href });
    }

    function populateVoucher() {
        const data = {
            destino: document.getElementById('destino').value, nombre: document.getElementById('nombre-completo').value, documento: document.getElementById('documento').value, 
            telefono: document.getElementById('telefono').value, email: document.getElementById('email').value, direccion: document.getElementById('direccion').value,
            fechaInput: document.getElementById('fecha-viaje').value, noches: document.getElementById('cantidad-noches').value, hotel: document.getElementById('hotel').value, localizador: document.getElementById('localizador').value || 'Pendiente', 
            habitaciones: document.getElementById('cantidad-habitaciones').value, valorRestante: document.getElementById('valor-restante').value, moneda: document.getElementById('moneda').value, regimen: document.getElementById('regimen').value, acompanantes: document.getElementById('acompanantes').value, observaciones: document.getElementById('observaciones').value,
        };
        const nochesInt = parseInt(data.noches, 10);
        const checkInDate = new Date(data.fechaInput + 'T00:00:00');
        const checkOutDate = new Date(checkInDate);
        checkOutDate.setDate(checkOutDate.getDate() + nochesInt);
        const fechaCheckInFormateada = formatDate(checkInDate);
        const fechaCheckOutFormateada = formatDate(checkOutDate);
        const valorFormateado = formatCurrency(data.valorRestante, data.moneda) + ' ' + data.moneda;
        const habitacionesInt = parseInt(data.habitaciones, 10);
        const habitacionesTexto = `${habitacionesInt} ${habitacionesInt > 1 ? 'habitaciones' : 'habitación'}`;

        let planDescription = '';
        switch(data.regimen) {
            case 'Solo hotel': planDescription = '<strong>Plan Incluye:</strong> Alojamiento según las noches estipuladas.'; break;
            case 'Hotel y desayuno': planDescription = '<strong>Plan Incluye:</strong> Alojamiento y Desayuno diario.'; break;
            case 'Media Pensión': planDescription = '<strong>Plan Incluye:</strong> Alojamiento, Desayuno y una comida principal.'; break;
            case 'Pensión Completa': planDescription = '<strong>Plan Incluye:</strong> Alojamiento, Desayuno, Almuerzo y Cena.'; break;
            case 'Todo incluido': planDescription = '<strong>Plan Incluye:</strong> Alojamiento, todas las comidas, bebidas y snacks ilimitados.'; break;
        }
        document.getElementById('confirm-nombre-intro').textContent = data.nombre;
        document.getElementById('confirm-destino').textContent = data.destino;
        document.getElementById('confirm-hotel').textContent = data.hotel;
        document.getElementById('confirm-localizador').textContent = data.localizador;
        document.getElementById('confirm-regimen').textContent = data.regimen;
        document.getElementById('confirm-habitaciones').textContent = habitacionesTexto;
        document.getElementById('confirm-nombre').textContent = data.nombre;
        document.getElementById('confirm-documento').textContent = data.documento;
        document.getElementById('confirm-telefono').textContent = data.telefono;
        document.getElementById('confirm-email').textContent = data.email;
        document.getElementById('confirm-direccion').textContent = data.direccion.trim() || 'No especificada';
        document.getElementById('confirm-acompanantes').textContent = data.acompanantes.trim() || 'No especificado';
        document.getElementById('confirm-checkin').textContent = fechaCheckInFormateada;
        document.getElementById('confirm-checkout').textContent = fechaCheckOutFormateada;
        document.getElementById('confirm-noches').textContent = `${nochesInt} ${nochesInt > 1 ? 'noches' : 'noche'}`;
        document.getElementById('confirm-observaciones').textContent = data.observaciones.trim() || 'Ninguna';
        document.getElementById('confirm-valor-restante').textContent = valorFormateado;
        document.getElementById('confirm-plan-incluye').innerHTML = planDescription;
        const msgVuelos = encodeURIComponent(`Hola, estoy interesado en cotizar tiquetes aéreos para mi reserva a ${data.destino}. Titular: ${data.nombre}`);
        const msgTours = encodeURIComponent(`Hola, me gustaría información sobre tours y actividades para mi reserva en ${data.hotel}. Titular: ${data.nombre}`);
        const msgTraslados = encodeURIComponent(`Hola, necesito cotizar los traslados privados para mi reserva en ${data.hotel}. Titular: ${data.nombre}`);
        document.getElementById('banner-vuelos').href = `https://wa.me/573147290720?text=${msgVuelos}`;
        document.getElementById('banner-tours').href = `https://wa.me/573147290720?text=${msgTours}`;
        document.getElementById('banner-traslados').href = `https://wa.me/573147290720?text=${msgTraslados}`;
    }

    // --- 4. FUNCIÓN PRINCIPAL DE PROCESAMIENTO ---
    async function processVoucher() {
        toggleLoader(true, "Generando PDF...");
        processBtn.disabled = true;

        try {
            const elementToPrint = document.getElementById('voucher-to-print');
            const canvas = await html2canvas(elementToPrint, { scale: 2, useCORS: true });
            const imgData = canvas.toDataURL('image/jpeg', 0.9);
            
            const imgWidth = canvas.width;
            const imgHeight = canvas.height;
            const pdf = new window.jspdf.jsPDF({
                orientation: 'p',
                unit: 'px',
                format: [imgWidth, imgHeight]
            });

            pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
            
            const scaleFactor = imgWidth / elementToPrint.offsetWidth;
            addLinkToPDF(pdf, 'banner-vuelos', elementToPrint, scaleFactor);
            addLinkToPDF(pdf, 'banner-tours', elementToPrint, scaleFactor);
            addLinkToPDF(pdf, 'banner-traslados', elementToPrint, scaleFactor);
            addLinkToPDF(pdf, 'footer-wpp-link', elementToPrint, scaleFactor);
            
            const nombreCliente = document.getElementById('nombre-completo').value;
            
            const localFileName = `Comprobante_${nombreCliente.replace(/ /g, '_')}.pdf`;
            pdf.save(localFileName);
            
            const pdfBlob = pdf.output('blob');
            const firebaseFileName = `comprobantes/Comprobante_${nombreCliente.replace(/ /g, '_')}_${Date.now()}.pdf`;
            toggleLoader(true, "Subiendo archivo...");
            const storageRef = storage.ref(firebaseFileName);
            const uploadTask = await storageRef.put(pdfBlob);
            const downloadURL = await uploadTask.ref.getDownloadURL();
            
            toggleLoader(true, "Enviando correo...");
            const templateParams = {
                nombre_cliente: nombreCliente,
                nombre_hotel: document.getElementById('hotel').value,
                to_email: document.getElementById('email').value,
                download_link: downloadURL
            };
            await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams);
            
            alert("¡ÉXITO!\n\nEl comprobante ha sido enviado y descargado correctamente.");

        } catch (error) {
            console.error("Error en el proceso:", error);
            alert("Hubo un error. Revisa la consola (F12) para más detalles.");
        } finally {
            toggleLoader(false);
            processBtn.disabled = false;
        }
    }
    
    // --- 5. EVENT LISTENERS ---
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        populateVoucher();
        formTitleSection.style.display = 'none';
        formSection.style.display = 'none';
        confirmationSection.style.display = 'block';
        window.scrollTo(0, 0);
    });

    processBtn.addEventListener('click', processVoucher);

    newVoucherBtn.addEventListener('click', (e) => {
        e.preventDefault();
        confirmationSection.style.display = 'none';
        formTitleSection.style.display = 'block';
        formSection.style.display = 'block';
        form.reset();
        document.getElementById('fecha-viaje').min = new Date().toISOString().split("T")[0];
        window.scrollTo(0, 0);
    });

    document.getElementById('valor-restante').addEventListener('input', function (e) {
        e.target.value = e.target.value.replace(/[^0-9]/g, '');
    });
    document.getElementById('fecha-viaje').min = new Date().toISOString().split("T")[0];
});
