import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Asset } from 'expo-asset';
import QRCode from 'qrcode';
import { Alert, Platform } from 'react-native';

/**
 * Share a generated PDF file.
 * On Android the raw file:// URL is private to our app, so it must be
 * converted to a content:// URI (FileProvider) before handing it to
 * other apps, otherwise shareAsync rejects with "Not allowed to read
 * file under given URL".
 */
export const sharePdfAsync = async (uri, dialogTitle = 'Share Certificate') => {
  // Normalize: printToFileAsync may return a bare path without a scheme
  let fileUri = uri || '';
  if (fileUri && !fileUri.startsWith('file://') && !fileUri.startsWith('content://')) {
    fileUri = `file://${fileUri}`;
  }
  console.log('Sharing PDF:', fileUri);

  const info = await FileSystem.getInfoAsync(fileUri);
  if (!info.exists) {
    throw new Error('Generated PDF file not found on device');
  }

  let shareUri = fileUri;
  if (Platform.OS === 'android') {
    try {
      // Copy into our cache dir, then expose via FileProvider so the
      // receiving app gets temporary read access.
      const dest = `${FileSystem.cacheDirectory}secflow-share.pdf`;
      await FileSystem.copyAsync({ from: fileUri, to: dest });
      shareUri = await FileSystem.getContentUriAsync(dest);
    } catch (e) {
      console.log('content URI conversion failed, falling back to file URI:', e);
    }
  }
  await Sharing.shareAsync(shareUri, {
    mimeType: 'application/pdf',
    dialogTitle,
  });
};

let logoCache = null;

export const getLogoDataUri = async () => {
  if (logoCache !== null) return logoCache;
  try {
    const asset = Asset.fromModule(require('../assets/images/sec_logo.png'));
    await asset.downloadAsync();
    const b64 = await FileSystem.readAsStringAsync(asset.localUri || asset.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    logoCache = `data:image/png;base64,${b64}`;
  } catch (e) {
    console.log('logo embed failed, using SEC badge:', e);
    logoCache = '';
  }
  return logoCache;
};

const logoHtml = (data) => data.logoUri
  ? `<img src="${data.logoUri}" style="width:80px;height:80px;border-radius:50%;" />`
  : `<span style="color: white; font-size: 30px; font-weight: bold;">SEC</span>`;

export const downloadAndSharePDF = async (type, data) => {  console.log('=== downloadAndSharePDF START ===');
  console.log('Type:', type);
  
  if (!data) {
    data = {
      studentName: 'Student Name',
      regNo: 'Reg No',
      department: 'Department',
      year: 'III',
      status: 'Approved',
      issuedDate: new Date().toLocaleDateString('en-GB'),
    };
    
    if (type === 'bonafide') {
      data.purpose = 'General';
    } else if (type === 'gatepass') {
      data.passId = 'GP001';
      data.visitDate = new Date().toLocaleDateString('en-GB');
      data.outTime = '10:00 AM';
      data.visitPlace = 'Home';
      data.reason = 'Personal Work';
    } else if (type === 'leave') {
      data.startDate = new Date().toLocaleDateString('en-GB');
      data.endDate = new Date().toLocaleDateString('en-GB');
      data.reason = 'Personal Work';
      data.resumeDate = new Date().toLocaleDateString('en-GB');
    }
  }
  
  let html = '';
  
  if (type === 'leave') {
    html = generateLeaveCertificateHTML({ ...data, logoUri: await getLogoDataUri() });
  } else if (type === 'bonafide') {
    html = generateBonafideCertificateHTML({ ...data, logoUri: await getLogoDataUri() });
  } else if (type === 'gatepass') {
    // Embed a scannable signed QR code in the gate pass PDF
    let qrSvg = '';
    if (data.qrPayload) {
      try {
        qrSvg = await QRCode.toString(data.qrPayload, { type: 'svg', margin: 1 });
      } catch (e) {
        console.log('QR generation failed:', e);
      }
    }
    html = generateGatepassHTML({ ...data, qrSvg, logoUri: await getLogoDataUri() });
  }

  console.log('HTML created');
  console.log('HTML length:', html.length);

  try {
    // Generate PDF
    const result = await Print.printToFileAsync({ html });
    console.log('PDF result:', result);

    // Handle different return types
    let uri = null;
    if (!result) {
      throw new Error('PDF generation returned null');
    }
    if (typeof result === 'string') {
      uri = result;
    } else if (result.uri) {
      uri = result.uri;
    }
    
    if (!uri) {
      throw new Error('PDF generation failed - no URI');
    }

    console.log('PDF URI:', uri);

    // Try sharing
    const isAvailable = await Sharing.isAvailableAsync();
    console.log('Sharing available:', isAvailable);

    if (!isAvailable) {
      Alert.alert('Success', 'Certificate generated successfully');
    } else {
      try {
        await sharePdfAsync(uri, 'Share Certificate');
        Alert.alert('Success', 'Certificate ready to share');
      } catch (shareErr) {
        // Expo Go sandboxes expo-print output outside the shareable
        // scope, so fall back to the system print dialog (no file
        // re-sharing involved) where the user can Save as PDF.
        console.log('Share sheet blocked, offering print dialog:', shareErr);
        Alert.alert(
          'Sharing Blocked',
          'Direct sharing is blocked in Expo Go. Open the print dialog to save your PDF instead?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Print', onPress: () => Print.printAsync({ html }) },
          ]
        );
      }
    }

    return { success: true, uri };
  } catch (error) {
    console.error('PDF Error:', error);
    const errorMsg = error?.message || String(error);
    Alert.alert('Error', `Failed: ${errorMsg}`);
    return { success: false, error: errorMsg };
  }
};

const generateLeaveCertificateHTML = (data) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Leave Certificate</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Times New Roman', serif; padding: 40px; color: #333; }
    .container { max-width: 700px; margin: 0 auto; border: 2px solid #1A429A; padding: 30px; }
    .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px dashed #ccc; }
    .logo { width: 80px; height: 80px; background: #1A429A; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; color: white; font-size: 40px; }
    .institute-name { font-size: 24px; font-weight: bold; color: #1A429A; }
    .institute-address { font-size: 12px; color: #666; margin-top: 5px; }
    .cert-title { text-align: center; margin: 25px 0; text-decoration: underline; text-decoration-color: #10b77f; text-decoration-thickness: 2px; }
    .cert-title h2 { font-size: 20px; text-transform: uppercase; letter-spacing: 2px; color: #333; }
    .cert-subtitle { font-size: 10px; color: #999; text-transform: uppercase; letter-spacing: 2px; margin-top: 5px; }
    .cert-body { font-size: 14px; line-height: 26px; text-align: justify; }
    .cert-body p { margin-bottom: 15px; }
    .bold { font-weight: bold; }
    .italic { font-style: italic; }
    .date-box { background: #10b77f15; border: 1px solid #10b77f30; border-radius: 10px; padding: 20px; margin: 20px 0; display: flex; justify-content: space-around; align-items: center; }
    .date-item { text-align: center; }
    .date-label { font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 1px; }
    .date-value { font-size: 16px; font-weight: bold; color: #111; margin-top: 5px; }
    .footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ccc; }
    .footer-date { text-align: left; }
    .footer-date p:first-child { font-size: 14px; font-weight: bold; }
    .footer-date p:last-child { font-size: 10px; color: #999; text-transform: uppercase; }
    .signature { text-align: right; }
    .signature-line { width: 120px; height: 1px; background: #ccc; margin-bottom: 5px; margin-left: auto; }
    .signature-text { font-size: 14px; font-style: italic; }
    .signature-label { font-size: 10px; color: #999; text-transform: uppercase; }
    .status { text-align: center; margin-top: 20px; color: #10b77f; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div style="text-align: center; margin-bottom: 15px;">
        <div class="logo" style="background: #1A429A; display: flex; align-items: center; justify-content: center; overflow: hidden; border-radius: 50%; margin: 0 auto;">
          ${logoHtml(data)}
        </div>
      </div>
      <div class="institute-name">Sengunthar Engineering College</div>
      <div class="institute-address">Kumaramangalam(PO), Tiruchengode - 637 205, Namakkal(Dt), Tamil Nadu</div>
      <div style="font-size: 11px; color: #666; margin-top: 3px;">Phone: 04288-255716 | Email: info@scteng.co.in</div>
    </div>
    <div class="cert-title">
      <h2>Leave Approval</h2>
      <p class="cert-subtitle">Official Document</p>
    </div>
    <div class="cert-body">
      <p>This is to certify that <span class="bold">${data.studentName}</span> (Reg No: <span class="bold">${data.regNo}</span>), a student of the <span class="bold">${data.department}</span> Department, Year <span class="bold">${data.year}</span>, has been granted official leave.</p>
      <div class="date-box">
        <div class="date-item">
          <p class="date-label">From</p>
          <p class="date-value">${data.startDate}</p>
        </div>
        <div>&#10140;</div>
        <div class="date-item">
          <p class="date-label">To</p>
          <p class="date-value">${data.endDate}</p>
        </div>
      </div>
      <p>Reason for absence: <span class="italic">"${data.reason}"</span>. The student is expected to resume classes on <span class="bold">${data.resumeDate}</span>.</p>
      ${data.hodName ? `<p style="text-align: center; font-size: 13px; margin-top: 12px;">Approved by: <span class="bold">${data.hodName}</span> (HOD)</p>` : ''}
    </div>
    <div class="footer">
      <div class="footer-date">
        <p>${data.issuedDate}</p>
        <p>Date Issued</p>
      </div>
      <div class="signature">
        <p class="signature-text">Principal</p>
        <div class="signature-line"></div>
        <p class="signature-label">Authorized Signatory</p>
      </div>
    </div>
    <div class="status">Status: ${data.status}</div>
  </div>
</body>
</html>
`;

const generateBonafideCertificateHTML = (data) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Bonafide Certificate</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Times New Roman', serif; padding: 40px; color: #333; }
    .container { max-width: 700px; margin: 0 auto; border: 2px solid #1A429A; padding: 30px; }
    .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px dashed #ccc; }
    .logo { width: 80px; height: 80px; background: #1A429A; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; color: white; font-size: 40px; }
    .institute-name { font-size: 24px; font-weight: bold; color: #1A429A; }
    .institute-address { font-size: 12px; color: #666; margin-top: 5px; }
    .cert-title { text-align: center; margin: 25px 0; text-decoration: underline; text-decoration-color: #10b77f; text-decoration-thickness: 2px; }
    .cert-title h2 { font-size: 20px; text-transform: uppercase; letter-spacing: 2px; color: #333; }
    .cert-subtitle { font-size: 10px; color: #999; text-transform: uppercase; letter-spacing: 2px; margin-top: 5px; }
    .cert-body { font-size: 14px; line-height: 26px; text-align: justify; }
    .cert-body p { margin-bottom: 15px; }
    .bold { font-weight: bold; }
    .purpose-box { background: #10b77f15; border: 1px solid #10b77f30; border-radius: 10px; padding: 20px; margin: 20px 0; text-align: center; }
    .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 16px 0; }
    .detail-item { background: #f8fafc; border-radius: 8px; padding: 12px; }
    .detail-item-full { grid-column: 1 / -1; background: #f8fafc; border-radius: 8px; padding: 12px; }
    .purpose-label { font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 1px; }
    .purpose-value { font-size: 16px; font-weight: bold; color: #111; margin-top: 5px; }
    .footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ccc; }
    .footer-date { text-align: left; }
    .footer-date p:first-child { font-size: 14px; font-weight: bold; }
    .footer-date p:last-child { font-size: 10px; color: #999; text-transform: uppercase; }
    .signature { text-align: right; }
    .signature-line { width: 120px; height: 1px; background: #ccc; margin-bottom: 5px; margin-left: auto; }
    .signature-text { font-size: 14px; font-style: italic; }
    .signature-label { font-size: 10px; color: #999; text-transform: uppercase; }
    .status { text-align: center; margin-top: 20px; color: #10b77f; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div style="text-align: center; margin-bottom: 15px;">
        <div class="logo" style="background: #1A429A; display: flex; align-items: center; justify-content: center; overflow: hidden; border-radius: 50%; margin: 0 auto;">
          ${logoHtml(data)}
        </div>
      </div>
      <div class="institute-name">Sengunthar Engineering College</div>
      <div class="institute-address">Kumaramangalam(PO), Tiruchengode - 637 205, Namakkal(Dt), Tamil Nadu</div>
      <div style="font-size: 11px; color: #666; margin-top: 3px;">Phone: 04288-255716 | Email: info@scteng.co.in</div>
    </div>
    <div class="cert-title">
      <h2>Bonafide Certificate</h2>
      <p class="cert-subtitle">Official Document</p>
    </div>
    <div class="cert-body">
      <p>This is to certify that <span class="bold">${data.studentName}</span> (Reg No: <span class="bold">${data.regNo}</span>), is a bonafide student of this institution, studying in <span class="bold">${data.year} Year</span>, <span class="bold">${data.department}</span> Department during the academic year 2025-2026.</p>
      <div class="purpose-box">
        <p class="purpose-label">Purpose</p>
        <p class="purpose-value">${data.purpose}</p>
      </div>
      <div class="details-grid">
        ${data.studyLevel ? `<div class="detail-item"><p class="detail-label">Study Level</p><p class="detail-value">${data.studyLevel}</p></div>` : ''}
        ${data.studentCategory ? `<div class="detail-item"><p class="detail-label">Student Category</p><p class="detail-value">${data.studentCategory}</p></div>` : ''}
        ${data.collegeType ? `<div class="detail-item"><p class="detail-label">College Type</p><p class="detail-value">${data.collegeType}</p></div>` : ''}
        ${data.address ? `<div class="detail-item-full"><p class="detail-label">Address</p><p class="detail-value">${data.address}</p></div>` : ''}
      </div>
      <p>This certificate is issued for <span class="bold">${data.purpose}</span> purposes.</p>
      ${data.hodName ? `<p style="text-align: center; font-size: 13px; margin-top: 12px;">Approved by: <span class="bold">${data.hodName}</span> (HOD)</p>` : ''}
    </div>
    <div class="footer">
      <div class="footer-date">
        <p>${data.issuedDate}</p>
        <p>Date Issued</p>
      </div>
      <div class="signature">
        <p class="signature-text">Principal</p>
        <div class="signature-line"></div>
        <p class="signature-label">Authorized Signatory</p>
      </div>
    </div>
    <div class="status">Status: ${data.status}</div>
  </div>
</body>
</html>
`;

const generateGatepassHTML = (data) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Gate Pass</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Times New Roman', serif; padding: 40px; color: #333; }
    .container { max-width: 700px; margin: 0 auto; border: 2px solid #1A429A; padding: 30px; }
    .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px dashed #ccc; }
    .logo { width: 80px; height: 80px; background: #1A429A; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; color: white; font-size: 40px; }
    .institute-name { font-size: 24px; font-weight: bold; color: #1A429A; }
    .institute-address { font-size: 12px; color: #666; margin-top: 5px; }
    .pass-id { text-align: center; margin: 20px 0; }
    .pass-id-label { font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 2px; }
    .pass-id-value { font-size: 28px; font-weight: bold; color: #1A429A; margin-top: 5px; }
    .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
    .detail-item { }
    .detail-label { font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 3px; }
    .detail-value { font-size: 14px; font-weight: bold; color: #111; }
    .permission-box { background: #1A429A10; border: 1px solid #1A429A30; border-radius: 10px; padding: 20px; margin: 20px 0; }
    .permission-row { display: flex; justify-content: space-between; margin-bottom: 15px; }
    .qr-box { text-align: center; margin: 10px 0 20px 0; }
    .qr-label { font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px; }
    .qr-box svg { width: 170px; height: 170px; }
    .permission-item { display: flex; align-items: center; gap: 10px; flex: 1; }
    .permission-label { font-size: 9px; color: #666; text-transform: uppercase; letter-spacing: 1px; }
    .permission-value { font-size: 13px; font-weight: bold; color: #111; }
    .footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ccc; }
    .footer-date { text-align: left; }
    .footer-date p:first-child { font-size: 14px; font-weight: bold; }
    .footer-date p:last-child { font-size: 10px; color: #999; text-transform: uppercase; }
    .signature { text-align: right; }
    .signature-line { width: 120px; height: 1px; background: #ccc; margin-bottom: 5px; margin-left: auto; }
    .signature-text { font-size: 14px; font-style: italic; }
    .signature-label { font-size: 10px; color: #999; text-transform: uppercase; }
    .status { text-align: center; margin-top: 20px; color: #10b77f; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div style="text-align: center; margin-bottom: 15px;">
        <div class="logo" style="background: #1A429A; display: flex; align-items: center; justify-content: center; overflow: hidden; border-radius: 50%; margin: 0 auto;">
          ${logoHtml(data)}
        </div>
      </div>
      <div class="institute-name">Sengunthar Engineering College</div>
      <div class="institute-address">Kumaramangalam(PO), Tiruchengode - 637 205, Namakkal(Dt), Tamil Nadu</div>
      <div style="font-size: 11px; color: #666; margin-top: 3px;">Phone: 04288-255716 | Email: info@scteng.co.in</div>
    </div>
    <div class="pass-id">
      <p class="pass-id-label">Pass ID</p>
      <p class="pass-id-value">${data.passId}</p>
    </div>
    <div class="qr-box">
      <p class="qr-label">Scan to Verify</p>
      ${data.qrSvg || ''}
    </div>
    <div class="details-grid">
      <div class="detail-item">
        <p class="detail-label">Student Name</p>
        <p class="detail-value">${data.studentName}</p>
      </div>
      <div class="detail-item">
        <p class="detail-label">Reg No</p>
        <p class="detail-value">${data.regNo}</p>
      </div>
      <div class="detail-item">
        <p class="detail-label">Department</p>
        <p class="detail-value">${data.department}</p>
      </div>
      <div class="detail-item">
        <p class="detail-label">Year</p>
        <p class="detail-value">${data.year}</p>
      </div>
    </div>
    <div class="permission-box">
      <div class="permission-row">
        <div class="permission-item">
          <span>&#128682;</span>
          <div>
            <p class="permission-label">Out Time</p>
            <p class="permission-value">${data.outTime}</p>
          </div>
        </div>
        <div class="permission-item">
          <span>&#128197;</span>
          <div>
            <p class="permission-label">Date</p>
            <p class="permission-value">${data.visitDate}</p>
          </div>
        </div>
      </div>
      <div class="permission-row">
        <div class="permission-item">
          <span>&#128205;</span>
          <div>
            <p class="permission-label">Destination</p>
            <p class="permission-value">${data.visitPlace || 'N/A'}</p>
          </div>
        </div>
        <div class="permission-item">
          <span>&#128221;</span>
          <div>
            <p class="permission-label">Reason</p>
            <p class="permission-value">${data.reason}</p>
          </div>
        </div>
      </div>
    </div>
    <div class="footer">
      <div class="footer-date">
        <p>${data.issuedDate}</p>
        <p>Date Issued</p>
      </div>
      <div class="signature">
        <p class="signature-text">Warden</p>
        ${data.staffName ? `<p style="font-size: 12px; color: #333;">Staff: <span class="bold">${data.staffName}</span></p>` : ''}
        ${data.hodName ? `<p style="font-size: 12px; font-weight: bold; color: #111;">HOD: <span class="bold">${data.hodName}</span></p>` : ''}
        <div class="signature-line"></div>
        <p class="signature-label">Authorized Signature</p>
      </div>
    </div>
    <div class="status">Status: ${data.status}</div>
  </div>
</body>
</html>
`;
