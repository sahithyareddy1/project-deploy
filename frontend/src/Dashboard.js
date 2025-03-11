import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Webcam from 'react-webcam';
import 'bootstrap/dist/css/bootstrap.min.css';
import * as faceapi from 'face-api.js'; // Import face-api.js

function Verification() {
    const [uniqueId, setUniqueId] = useState('');
    const [ecId, setEcId] = useState('');
    const [message, setMessage] = useState('');
    const [capturedImage, setCapturedImage] = useState(null);
    const webcamRef = useRef(null);
    const navigate = useNavigate();

    const [faceDetected, setFaceDetected] = useState(false); // State to track face detection
    const [modelsLoaded, setModelsLoaded] = useState(false); // State to track model loading

    const videoConstraints = {
        width: 500,
        height: 375,
        facingMode: 'user'
    };

    useEffect(() => {
        const loadModels = async () => {
            try {
                // Load face-api.js models
                await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
                await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
                await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
                await faceapi.nets.faceExpressionNet.loadFromUri('/models');
                setModelsLoaded(true); // Set modelsLoaded to true after loading
            } catch (error) {
                console.error("Error loading models:", error);
                setMessage("Error loading face detection models. Please refresh the page.");
            }
        };

        loadModels();
    }, []);

    const dataURLtoBlob = (dataurl) => {
        var arr = dataurl.split(','),
            mime = arr[0].match(/:(.*?);/)[1],
            bstr = atob(arr[1]),
            n = bstr.length,
            u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], { type: mime });
    }

    const capture = async () => {
        if (!modelsLoaded) {
            setMessage("Face detection models are still loading. Please wait.");
            return;
        }

        const imageSrc = webcamRef.current.getScreenshot();
        console.log("Captured imageSrc:", imageSrc);
        const imageBlob = dataURLtoBlob(imageSrc);
        setCapturedImage(imageBlob);

        // Perform face detection
        const img = new Image();
        img.src = imageSrc;
        img.onload = async () => {
            const detections = await faceapi.detectAllFaces(img, new faceapi.TinyFaceDetectorOptions());
            if (detections.length > 0) {
                setFaceDetected(true);
                setMessage(''); // Clear any previous messages
            } else {
                setFaceDetected(false);
                setMessage('No face detected. Please try again.');
                setCapturedImage(null); // Clear the captured image
            }
        };
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!capturedImage) {
            setMessage('Please capture an image.');
            return;
        }

        if (!faceDetected) {
            setMessage('No face detected. Please try again.');
            return;
        }

        const formData = new FormData();
        formData.append('unique_id', uniqueId);
        formData.append('ec_id', ecId);
        formData.append('image', capturedImage, "captured_image.jpg"); // Append Blob

        // Log form data
        for (let [key, value] of formData.entries()) {
            console.log(key, value);
        }

        try {
            const response = await axios.post('http://localhost:5000/verify', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                },
            });
            console.log("Response Data:", response.data);
            setMessage(response.data.message);
            if (response.data.status === "success") {
                const voterData = {
                    uniqueId,
                    ecId,
                    capturedImage
                };
                console.log("Saving voterData:", voterData);
                localStorage.setItem('voterData', JSON.stringify(voterData));
                navigate('/welcome', { state: voterData });
            }
        } catch (error) {
            console.error('Error:', error);
            setMessage('Face verification failed');
        }
    };

    return (
        <div className="container mt-5" style={{ maxWidth: '500px' }}>
            <div className="card shadow">
                <div className="card-body">
                    <h1 className="card-title mb-4 text-center">Online Voting System</h1>
                    <form onSubmit={handleSubmit}>
                        <div className="mb-3">
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Unique ID"
                                value={uniqueId}
                                onChange={(e) => setUniqueId(e.target.value)}
                                required
                            />
                        </div>
                        <div className="mb-3">
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Election Commission ID"
                                value={ecId}
                                onChange={(e) => setEcId(e.target.value)}
                                required
                            />
                        </div>
                        <div className="mb-3 text-center no-long-press">
                            <Webcam
                                audio={false}
                                height={375}
                                ref={webcamRef}
                                screenshotFormat="image/jpeg"
                                width={500}
                                videoConstraints={videoConstraints}
                            />
                            <button type="button" className="btn btn-secondary mt-2" onClick={capture} disabled={!modelsLoaded}>
                                Capture Photo
                            </button>
                        </div>
                        {capturedImage && (
                            <div className="mb-3 text-center">
                                <img src={URL.createObjectURL(capturedImage)} alt="Captured" className="img-fluid rounded" />
                            </div>
                        )}
                        <button type="submit" className="btn btn-primary w-100" disabled={!faceDetected}>Verify Face</button>
                    </form>
                    {message && (
                        <div className="alert alert-info mt-3" role="alert">{message}</div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Verification;

