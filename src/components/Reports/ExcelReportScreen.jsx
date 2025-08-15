import { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { InventoryService } from '../../services/inventoryService';

function ExcelReportScreen() {
  const { profile, isAdmin, user } = useAuth();
  const [uploadedData, setUploadedData] = useState(null);
  const [processedData, setProcessedData] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [isHovered, setIsHovered] = useState(false);
  const [monthlyReports, setMonthlyReports] = useState([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSavingReport, setIsSavingReport] = useState(false);
  const [showHistorial, setShowHistorial] = useState(false);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [showDataModal, setShowDataModal] = useState(false);
  const [selectedReportData, setSelectedReportData] = useState(null);
  const [loadingReportData, setLoadingReportData] = useState(false);
  const fileInputRef = useRef(null);

  // Cargar historial de reportes al montar el componente
  useEffect(() => {
    if (profile?.id_sucursal) {
      loadMonthlyReports();
    }
  }, [profile?.id_sucursal, isAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMonthlyReports = async () => {
    try {
      setLoadingHistorial(true);
      let reports;
      
      if (isAdmin) {
        reports = await InventoryService.getAllMonthlyReports();
      } else {
        reports = await InventoryService.getMonthlyReports(profile.id_sucursal);
      }
      
      setMonthlyReports(reports);
    } catch (error) {
      console.error('Error loading monthly reports:', error);
      setError(`Error al cargar historial: ${error.message}`);
    } finally {
      setLoadingHistorial(false);
    }
  };

  const handleSaveMonthlyReport = async () => {
    if (!processedData || processedData.length === 0) {
      setError('No hay datos procesados para guardar');
      return;
    }

    if (!profile?.id_sucursal) {
      setError('No se puede identificar la sucursal');
      return;
    }

    try {
      setIsSavingReport(true);
      setError(null);

      const reportData = {
        sucursalId: profile.id_sucursal,
        reporteData: processedData,
        usuario: user?.email || 'Usuario desconocido'
      };

      const result = await InventoryService.saveMonthlyReportAndReset(reportData);

      console.log('✅ Reporte guardado y inventario reseteado:', result);
      
      // Limpiar datos actuales
      setProcessedData([]);
      setUploadedData(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Recargar historial
      await loadMonthlyReports();

      setShowConfirmModal(false);
      alert(`Reporte mensual guardado exitosamente para ${result.mes}/${result.año}. ${result.productosReseteados} productos reseteados.`);

    } catch (error) {
      console.error('Error saving monthly report:', error);
      setError(`Error al guardar reporte mensual: ${error.message}`);
    } finally {
      setIsSavingReport(false);
    }
  };

  const handleViewReportData = async (reportId) => {
    try {
      setLoadingReportData(true);
      setShowDataModal(true);
      
      const reportDetails = await InventoryService.getMonthlyReportDetails(reportId);
      setSelectedReportData(reportDetails);
      
    } catch (error) {
      console.error('Error loading report data:', error);
      setError(`Error al cargar datos del reporte: ${error.message}`);
      setShowDataModal(false);
    } finally {
      setLoadingReportData(false);
    }
  };

  const handleCloseDataModal = () => {
    setShowDataModal(false);
    setSelectedReportData(null);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.name.match(/\.(xlsx|xls)$/)) {
      setError('Por favor, selecciona un archivo Excel válido (.xlsx o .xls)');
      return;
    }

    setIsProcessing(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get the first worksheet
        const worksheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[worksheetName];
        
        // Convert to JSON with header row
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length < 2) {
          throw new Error('El archivo debe contener al menos una fila de datos además del encabezado');
        }

        setUploadedData({
          filename: file.name,
          worksheet: worksheetName,
          headers: jsonData[0],
          data: jsonData.slice(1), // Remove header row
          totalRows: jsonData.length - 1
        });

        await processExcelData(jsonData);
      } catch (error) {
        console.error('Error processing file:', error);
        setError(`Error al procesar el archivo: ${error.message}`);
      } finally {
        setIsProcessing(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // Optimized function to load all inventory data at once
  const loadAllInventoryData = async () => {
    try {
      if (!profile?.id_sucursal && !isAdmin) {
        return { productMap: new Map(), inventoryMap: new Map() };
      }

      const idSucursal = profile?.id_sucursal;
      if (!idSucursal) {
        return { productMap: new Map(), inventoryMap: new Map() };
      }

      console.log('🔄 Cargando inventario completo de la sucursal...');

      // Single query to get all inventory with product info for the sucursal
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('inventarios')
        .select(`
          cantidad_actual,
          productos!inner (
            id_producto,
            codigo_mrp,
            codigo_truper
          )
        `)
        .eq('id_sucursal', idSucursal);

      if (inventoryError) {
        console.error('Error loading inventory:', inventoryError);
        return { productMap: new Map(), inventoryMap: new Map() };
      }

      console.log(`✅ Inventario cargado: ${inventoryData?.length || 0} productos`);

      // Create lookup maps for O(1) access
      const productMap = new Map(); // materialCode -> product data
      const inventoryMap = new Map(); // materialCode -> cantidad_actual

      (inventoryData || []).forEach(item => {
        const product = item.productos;
        if (product) {
          // Map by MRP code
          if (product.codigo_mrp) {
            productMap.set(product.codigo_mrp.trim(), product);
            inventoryMap.set(product.codigo_mrp.trim(), item.cantidad_actual || 0);
          }
          // Map by Truper code as fallback
          if (product.codigo_truper) {
            productMap.set(product.codigo_truper.trim(), product);
            inventoryMap.set(product.codigo_truper.trim(), item.cantidad_actual || 0);
          }
        }
      });

      console.log(`📊 Maps created: ${productMap.size} product codes mapped`);
      
      return { productMap, inventoryMap };

    } catch (error) {
      console.error('Error loading inventory data:', error);
      return { productMap: new Map(), inventoryMap: new Map() };
    }
  };

  const processExcelData = async (jsonData) => {
    try {
      const headers = jsonData[0];
      const rows = jsonData.slice(1);
      
      console.log('Headers found:', headers); // Debug: show available headers
      
      // Find column indices by exact column name matching
      const materialColIndex = headers.findIndex(h => 
        h && h.toString().trim() === 'Material'
      );
      
      const inventoryColIndex = headers.findIndex(h => 
        h && h.toString().trim() === 'Libre utilización'
      );
      
      // Find description column
      const descColIndex = headers.findIndex(h => 
        h && h.toString().trim() === 'Texto breve de material'
      );
      
      // Optional: try to find value/cost column
      const valueColIndex = headers.findIndex(h => 
        h && (h.toString().toLowerCase().includes('valor') || 
        h.toString().toLowerCase().includes('value') ||
        h.toString().toLowerCase().includes('cost') ||
        h.toString().toLowerCase().includes('precio'))
      );

      console.log('Column indices found:', {
        material: materialColIndex,
        inventory: inventoryColIndex, 
        description: descColIndex,
        value: valueColIndex
      });

      // Validate that required columns were found
      if (materialColIndex === -1) {
        throw new Error('No se encontró la columna "Material". Verificar que el archivo tenga la estructura correcta.');
      }
      if (inventoryColIndex === -1) {
        throw new Error('No se encontró la columna "Libre utilización". Verificar que el archivo tenga la estructura correcta.');
      }

      // Load all inventory data at once for optimal performance
      console.log('🚀 Optimizando: Cargando todo el inventario de una vez...');
      const { inventoryMap } = await loadAllInventoryData();
      
      // Process data with fast in-memory lookup
      const processed = [];
      const totalRows = rows.length;
      
      console.log(`📋 Procesando ${totalRows} productos del Excel...`);
      
      for (let index = 0; index < rows.length; index++) {
        const row = rows[index];
        const material = row[materialColIndex] || '';
        
        // Skip rows without material code
        if (!material || material.toString().trim() === '') {
          continue;
        }
        
        const materialCode = material.toString().trim();
        const systemInventory = parseFloat(row[inventoryColIndex]) || 0;
        const description = descColIndex >= 0 ? (row[descColIndex] || '') : 'Sin descripción';
        const unitValue = valueColIndex >= 0 ? (parseFloat(row[valueColIndex]) || 0) : 0;
        
        // Fast O(1) lookup for physical inventory
        const physicalCount = inventoryMap.get(materialCode) || 0;
        
        const difference = physicalCount - systemInventory;
        const costDifference = unitValue > 0 ? difference * unitValue : 0;

        // Debug log for first few items
        if (index < 3) {
          console.log(`Row ${index + 1}:`, {
            material: materialCode,
            systemInventory: systemInventory,
            physicalCount: physicalCount,
            description: description,
            difference: difference,
            foundInDB: inventoryMap.has(materialCode)
          });
        }

        processed.push({
          id: index + 1,
          material: materialCode,
          description: description.toString().trim(),
          systemInventory,
          physicalCount,
          difference,
          unitValue,
          costDifference,
          // Keep raw row data for debugging
          rawData: row
        });
      }
      
      console.log(`✅ Procesamiento completado: ${processed.length} productos procesados`);
      console.log(`📊 Productos encontrados en BD: ${processed.filter(p => p.physicalCount > 0).length}`);
      console.log(`⚠️ Productos no encontrados: ${processed.filter(p => p.physicalCount === 0).length}`);

      setProcessedData(processed);
      
      if (processed.length === 0) {
        setError('No se encontraron datos válidos en las columnas especificadas: Material, Libre utilización');
      }

    } catch (error) {
      console.error('Error processing data:', error);
      setError(`Error al procesar los datos: ${error.message}`);
    }
  };

  const handleExportResults = () => {
    if (processedData.length === 0) return;

    // Prepare data for export
    const exportData = processedData.map(item => ({
      'Código MRP': item.material,
      'Descripción': item.description,
      'Sistema ERP': item.systemInventory,
      'App/Físico': item.physicalCount,
      'Diferencia (Físico - Sistema)': item.difference,
      'Valor Unitario': item.unitValue,
      'Diferencia en Costo': item.costDifference
    }));

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(exportData);
    
    // Set column widths
    const colWidths = [
      { wch: 15 }, // Código Material
      { wch: 30 }, // Descripción
      { wch: 12 }, // Inventario Sistema
      { wch: 12 }, // Conteo Físico
      { wch: 10 }, // Diferencia
      { wch: 12 }, // Valor Unitario
      { wch: 15 }  // Diferencia en Costo
    ];
    ws['!cols'] = colWidths;

    // Create workbook and export
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reporte de Comparación");
    
    const filename = `reporte_comparacion_${new Date().toISOString().slice(0,10)}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  const clearData = () => {
    setUploadedData(null);
    setProcessedData([]);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getSummaryStats = () => {
    if (processedData.length === 0) return null;
    
    const totalPositiveDiff = processedData.filter(item => item.difference > 0).length;
    const totalNegativeDiff = processedData.filter(item => item.difference < 0).length;
    const totalNoDiff = processedData.filter(item => item.difference === 0).length;
    const totalCostDifference = processedData.reduce((sum, item) => sum + item.costDifference, 0);

    return {
      totalItems: processedData.length,
      totalPositiveDiff,
      totalNegativeDiff,
      totalNoDiff,
      totalCostDifference
    };
  };

  const stats = getSummaryStats();

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-light text-white/95 mb-4 tracking-wide">
          Análisis de <span className="font-semibold text-red-400">Reporte ERP</span>
        </h2>
        <p className="text-white/60 font-light text-lg max-w-3xl mx-auto leading-relaxed">
          Carga archivos Excel del sistema ERP para comparar inventario del sistema vs inventario registrado en la aplicación
        </p>
        <div className="mt-4 p-4 bg-blue-500/10 border border-blue-400/20 rounded-xl max-w-4xl mx-auto">
          <p className="text-blue-200 text-sm font-medium mb-2">📋 Columnas requeridas en el Excel:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            <span className="text-blue-300">• <strong>"Material":</strong> Código MRP del producto</span>
            <span className="text-blue-300">• <strong>"Libre utilización":</strong> Inventario del sistema ERP</span>
          </div>
          <div className="mt-2 text-xs">
            <span className="text-blue-300">• <strong>"Texto breve de material":</strong> Descripción (opcional)</span>
          </div>
        </div>
      </div>

      {/* Historial Toggle Button */}
      <div className="mb-8 text-center">
        <button
          onClick={() => setShowHistorial(!showHistorial)}
          className="px-6 py-3 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/30 rounded-xl text-blue-200 hover:text-blue-100 font-medium transition-colors flex items-center space-x-2 mx-auto"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{showHistorial ? 'Ocultar Historial' : 'Ver Historial de Reportes'}</span>
        </button>
      </div>

      {/* Historial Section */}
      {showHistorial && (
        <div className="mb-8 bg-white/[0.06] border border-white/[0.12] rounded-2xl backdrop-blur-xl overflow-hidden">
          <div className="p-6 border-b border-white/10">
            <h3 className="text-xl font-medium text-white/95 mb-4">
              Historial de Reportes Mensuales
            </h3>
            
            {loadingHistorial ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-3 border-blue-400/30 rounded-full animate-spin mx-auto mb-4">
                  <div className="w-8 h-8 border-3 border-transparent border-t-blue-400 rounded-full"></div>
                </div>
                <p className="text-white/60">Cargando historial...</p>
              </div>
            ) : monthlyReports.length === 0 ? (
              <div className="text-center py-8">
                <svg className="w-12 h-12 text-white/40 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3-7.5H21m-3.75 0V10.5a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 10.5v7.5a2.25 2.25 0 002.25 2.25H17.25a2.25 2.25 0 002.25-2.25V13.5zm0 0V9a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 9v4.5z" />
                </svg>
                <p className="text-white/60">No hay reportes mensuales guardados</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-white/[0.03] border-b border-white/10">
                      <th className="px-4 py-3 text-left text-sm font-medium text-white/80">Período</th>
                      {isAdmin && <th className="px-4 py-3 text-left text-sm font-medium text-white/80">Sucursal</th>}
                      <th className="px-4 py-3 text-right text-sm font-medium text-white/80">Productos</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-white/80">Diferencias</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-white/80">Usuario</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-white/80">Fecha</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-white/80">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyReports.map((report) => (
                      <tr key={report.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-white/90">
                          {String(report.mes).padStart(2, '0')}/{report.año}
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-3 text-sm text-white/70">
                            {report.sucursales?.Sucursal || 'N/A'}
                          </td>
                        )}
                        <td className="px-4 py-3 text-sm text-right text-white/80">
                          {report.total_productos || 0}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-white/80">
                          {report.total_diferencias || 0}
                        </td>
                        <td className="px-4 py-3 text-sm text-white/70">
                          {report.usuario_creacion}
                        </td>
                        <td className="px-4 py-3 text-sm text-white/70">
                          {new Date(report.fecha_creacion).toLocaleDateString('es-MX')}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleViewReportData(report.id)}
                            className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/30 rounded-lg text-blue-200 hover:text-blue-100 text-xs font-medium transition-colors flex items-center space-x-1 mx-auto"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span>Ver Datos</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upload Section */}
      <div 
        className={`
          relative overflow-hidden rounded-2xl backdrop-blur-xl border border-white/10 
          bg-gradient-to-br from-white/[0.08] via-white/[0.04] to-white/[0.02]
          transition-all duration-500 ease-out shadow-xl shadow-black/10 mb-8
          ${isHovered ? 'transform scale-[1.01] shadow-2xl shadow-white/5' : ''}
        `}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="relative z-10 p-8">
          <div className="flex items-center mb-6 space-x-4">
            <div className="p-3 rounded-2xl bg-blue-500/20 border border-blue-400/30 backdrop-blur-sm">
              <svg className="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            
            <div className="flex-1">
              <h3 className="text-xl font-medium text-white/95 tracking-wide mb-1">
                Cargar Reporte Excel
              </h3>
              <p className="text-sm text-white/60 font-light">
                Formatos soportados: .xlsx, .xls
              </p>
            </div>
          </div>

          {/* File Upload Area */}
          <div className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
              id="excel-upload"
            />
            
            <label
              htmlFor="excel-upload"
              className={`
                group relative block w-full p-8 border-2 border-dashed rounded-2xl cursor-pointer
                transition-all duration-300 ease-out
                ${isProcessing 
                  ? 'border-blue-400/40 bg-blue-500/10' 
                  : 'border-white/20 hover:border-blue-400/50 hover:bg-blue-500/5'
                }
              `}
            >
              <div className="text-center">
                {isProcessing ? (
                  <>
                    <div className="w-12 h-12 border-3 border-blue-400/30 rounded-full animate-spin mx-auto mb-4">
                      <div className="w-12 h-12 border-3 border-transparent border-t-blue-400 rounded-full"></div>
                    </div>
                    <p className="text-blue-300 font-medium">Procesando archivo...</p>
                  </>
                ) : (
                  <>
                    <svg className="w-16 h-16 text-white/40 mx-auto mb-4 group-hover:text-blue-400/60 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                    </svg>
                    <p className="text-white/80 font-medium mb-2">Click para seleccionar archivo</p>
                    <p className="text-white/50 text-sm">o arrastra y suelta un archivo Excel aquí</p>
                  </>
                )}
              </div>
            </label>

            {/* File Info */}
            {uploadedData && (
              <div className="mt-4 p-4 bg-green-500/20 border border-green-400/30 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-200 font-medium">{uploadedData.filename}</p>
                    <p className="text-green-300/80 text-sm">
                      {uploadedData.totalRows} filas procesadas • Hoja: {uploadedData.worksheet}
                    </p>
                  </div>
                  <button
                    onClick={clearData}
                    className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 text-red-200 hover:text-red-100 transition-colors"
                    title="Limpiar datos"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-8 p-4 bg-red-500/20 border border-red-400/30 rounded-2xl">
          <div className="flex items-center space-x-3">
            <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="text-red-200 font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* Summary Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-white/[0.06] border border-white/[0.12] rounded-xl p-4 backdrop-blur-xl">
            <div className="text-center">
              <div className="text-2xl font-semibold text-white/95">{stats.totalItems}</div>
              <div className="text-xs text-white/60">Total Items</div>
            </div>
          </div>
          
          <div className="bg-green-500/[0.08] border border-green-400/[0.15] rounded-xl p-4 backdrop-blur-xl">
            <div className="text-center">
              <div className="text-2xl font-semibold text-green-300">{stats.totalPositiveDiff}</div>
              <div className="text-xs text-white/60">Sobrantes</div>
            </div>
          </div>
          
          <div className="bg-red-500/[0.08] border border-red-400/[0.15] rounded-xl p-4 backdrop-blur-xl">
            <div className="text-center">
              <div className="text-2xl font-semibold text-red-300">{stats.totalNegativeDiff}</div>
              <div className="text-xs text-white/60">Faltantes</div>
            </div>
          </div>
          
          <div className="bg-blue-500/[0.08] border border-blue-400/[0.15] rounded-xl p-4 backdrop-blur-xl">
            <div className="text-center">
              <div className="text-2xl font-semibold text-blue-300">{stats.totalNoDiff}</div>
              <div className="text-xs text-white/60">Sin Diferencia</div>
            </div>
          </div>
          
          <div className="bg-yellow-500/[0.08] border border-yellow-400/[0.15] rounded-xl p-4 backdrop-blur-xl">
            <div className="text-center">
              <div className="text-lg font-semibold text-yellow-300">
                ${stats.totalCostDifference.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-white/60">Diferencia Total</div>
            </div>
          </div>
        </div>
      )}

      {/* Results Table */}
      {processedData.length > 0 && (
        <div className="bg-white/[0.06] border border-white/[0.12] rounded-2xl backdrop-blur-xl overflow-hidden">
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-medium text-white/95">
                Reporte de Comparación
              </h3>
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleExportResults}
                  className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-400/30 rounded-xl text-green-200 hover:text-green-100 font-medium transition-colors flex items-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  <span>Exportar Excel</span>
                </button>
                
                <button
                  onClick={() => setShowConfirmModal(true)}
                  disabled={isSavingReport}
                  className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 rounded-xl text-red-200 hover:text-red-100 font-medium transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3-7.5H21m-3.75 0V10.5a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 10.5v7.5a2.25 2.25 0 002.25 2.25H17.25a2.25 2.25 0 002.25-2.25V13.5zm0 0V9a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 9v4.5z" />
                  </svg>
                  <span>{isSavingReport ? 'Guardando...' : 'Guardar Reporte Mensual'}</span>
                </button>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-white/[0.03] border-b border-white/10">
                  <th className="px-4 py-3 text-left text-sm font-medium text-white/80">Código MRP</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-white/80">Descripción</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-white/80">Sistema ERP</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-white/80">App/Físico</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-white/80">Diferencia</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-white/80">Valor Unit.</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-white/80">Dif. Costo</th>
                </tr>
              </thead>
              <tbody>
                {processedData.map((item) => (
                  <tr key={item.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-white/90">{item.material}</td>
                    <td className="px-4 py-3 text-sm text-white/70">{item.description}</td>
                    <td className="px-4 py-3 text-sm text-right text-white/80">{item.systemInventory}</td>
                    <td className="px-4 py-3 text-sm text-right text-white/80">{item.physicalCount}</td>
                    <td className={`px-4 py-3 text-sm text-right font-medium ${
                      item.difference > 0 ? 'text-green-400' : 
                      item.difference < 0 ? 'text-red-400' : 'text-white/60'
                    }`}>
                      {item.difference > 0 ? '+' : ''}{item.difference}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-white/70">
                      {item.unitValue > 0 ? `$${item.unitValue.toFixed(2)}` : '-'}
                    </td>
                    <td className={`px-4 py-3 text-sm text-right font-medium ${
                      item.costDifference > 0 ? 'text-green-400' : 
                      item.costDifference < 0 ? 'text-red-400' : 'text-white/60'
                    }`}>
                      {item.costDifference !== 0 ? 
                        `$${item.costDifference.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : 
                        '-'
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Confirmación */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-white/20 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-500/20 border border-red-400/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              
              <h3 className="text-xl font-semibold text-white mb-2">
                Confirmar Guardado de Reporte Mensual
              </h3>
              
              <p className="text-white/70 mb-4">
                Esta acción guardará el reporte como "Informe del mes actual" y <strong className="text-red-400">reseteará a CERO todas las cantidades</strong> del inventario de tu sucursal.
              </p>
              
              <div className="bg-yellow-500/10 border border-yellow-400/30 rounded-xl p-4 mb-4">
                <div className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div className="text-left">
                    <p className="text-sm text-yellow-200 font-medium mb-1">¡Atención!</p>
                    <p className="text-xs text-yellow-300">
                      • Se creará un registro permanente del reporte<br/>
                      • Todos los productos volverán a cantidad 0<br/>
                      • Esta acción NO se puede deshacer<br/>
                      • Solo se permite un reporte por mes
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={isSavingReport}
                className="flex-1 px-4 py-3 bg-gray-600/20 hover:bg-gray-600/30 border border-gray-500/30 rounded-xl text-gray-200 hover:text-gray-100 font-medium transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              
              <button
                onClick={handleSaveMonthlyReport}
                disabled={isSavingReport}
                className="flex-1 px-4 py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 rounded-xl text-red-200 hover:text-red-100 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {isSavingReport ? (
                  <>
                    <div className="w-4 h-4 border-2 border-red-400/30 rounded-full animate-spin">
                      <div className="w-4 h-4 border-2 border-transparent border-t-red-400 rounded-full"></div>
                    </div>
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    <span>Confirmar y Guardar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Datos del Reporte */}
      {showDataModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-white/20 rounded-2xl max-w-6xl w-full max-h-[90vh] mx-4 shadow-2xl flex flex-col">
            {/* Header del modal */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-white mb-1">
                  Datos del Reporte Mensual
                </h3>
                {selectedReportData && (
                  <p className="text-white/60 text-sm">
                    {String(selectedReportData.mes).padStart(2, '0')}/{selectedReportData.año} 
                    {selectedReportData.sucursales?.Sucursal && ` - ${selectedReportData.sucursales.Sucursal}`}
                  </p>
                )}
              </div>
              <button
                onClick={handleCloseDataModal}
                className="p-2 rounded-lg bg-gray-600/20 hover:bg-gray-600/30 border border-gray-500/30 text-gray-300 hover:text-gray-100 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Contenido del modal */}
            <div className="flex-1 overflow-hidden">
              {loadingReportData ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="w-8 h-8 border-3 border-blue-400/30 rounded-full animate-spin mx-auto mb-4">
                      <div className="w-8 h-8 border-3 border-transparent border-t-blue-400 rounded-full"></div>
                    </div>
                    <p className="text-white/60">Cargando datos del reporte...</p>
                  </div>
                </div>
              ) : selectedReportData && selectedReportData.datos_reporte ? (
                <div className="p-6 overflow-auto h-full">
                  {/* Resumen del reporte */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white/[0.06] border border-white/[0.12] rounded-xl p-4 text-center">
                      <div className="text-2xl font-semibold text-white/95">{selectedReportData.total_productos}</div>
                      <div className="text-xs text-white/60">Total Productos</div>
                    </div>
                    <div className="bg-green-500/[0.08] border border-green-400/[0.15] rounded-xl p-4 text-center">
                      <div className="text-2xl font-semibold text-green-300">
                        {selectedReportData.datos_reporte.filter(item => item.difference > 0).length}
                      </div>
                      <div className="text-xs text-white/60">Sobrantes</div>
                    </div>
                    <div className="bg-red-500/[0.08] border border-red-400/[0.15] rounded-xl p-4 text-center">
                      <div className="text-2xl font-semibold text-red-300">
                        {selectedReportData.datos_reporte.filter(item => item.difference < 0).length}
                      </div>
                      <div className="text-xs text-white/60">Faltantes</div>
                    </div>
                    <div className="bg-blue-500/[0.08] border border-blue-400/[0.15] rounded-xl p-4 text-center">
                      <div className="text-2xl font-semibold text-blue-300">
                        {selectedReportData.datos_reporte.filter(item => item.difference === 0).length}
                      </div>
                      <div className="text-xs text-white/60">Sin Diferencia</div>
                    </div>
                  </div>

                  {/* Tabla de datos */}
                  <div className="bg-white/[0.06] border border-white/[0.12] rounded-2xl overflow-hidden">
                    <div className="p-4 border-b border-white/10">
                      <h4 className="text-lg font-medium text-white/95">
                        Detalle de Productos ({selectedReportData.datos_reporte.length} items)
                      </h4>
                    </div>
                    
                    <div className="overflow-x-auto max-h-96">
                      <table className="w-full">
                        <thead className="sticky top-0 bg-gray-900/95 backdrop-blur-sm">
                          <tr className="bg-white/[0.03] border-b border-white/10">
                            <th className="px-4 py-3 text-left text-sm font-medium text-white/80">Código MRP</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-white/80">Descripción</th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-white/80">Sistema ERP</th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-white/80">App/Físico</th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-white/80">Diferencia</th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-white/80">Valor Unit.</th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-white/80">Dif. Costo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedReportData.datos_reporte.map((item, index) => (
                            <tr key={index} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                              <td className="px-4 py-3 text-sm font-medium text-white/90">{item.material}</td>
                              <td className="px-4 py-3 text-sm text-white/70">{item.description}</td>
                              <td className="px-4 py-3 text-sm text-right text-white/80">{item.systemInventory}</td>
                              <td className="px-4 py-3 text-sm text-right text-white/80">{item.physicalCount}</td>
                              <td className={`px-4 py-3 text-sm text-right font-medium ${
                                item.difference > 0 ? 'text-green-400' : 
                                item.difference < 0 ? 'text-red-400' : 'text-white/60'
                              }`}>
                                {item.difference > 0 ? '+' : ''}{item.difference}
                              </td>
                              <td className="px-4 py-3 text-sm text-right text-white/70">
                                {item.unitValue > 0 ? `$${item.unitValue.toFixed(2)}` : '-'}
                              </td>
                              <td className={`px-4 py-3 text-sm text-right font-medium ${
                                item.costDifference > 0 ? 'text-green-400' : 
                                item.costDifference < 0 ? 'text-red-400' : 'text-white/60'
                              }`}>
                                {item.costDifference !== 0 ? 
                                  `$${item.costDifference.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : 
                                  '-'
                                }
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <svg className="w-12 h-12 text-white/40 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                    <p className="text-white/60">No hay datos disponibles para este reporte</p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer del modal */}
            <div className="p-4 border-t border-white/10 text-center">
              <button
                onClick={handleCloseDataModal}
                className="px-6 py-2 bg-gray-600/20 hover:bg-gray-600/30 border border-gray-500/30 rounded-xl text-gray-200 hover:text-gray-100 font-medium transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExcelReportScreen;