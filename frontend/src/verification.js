import React, { useState, useRef, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import Verification from './verification';  // Import the Verification component
import Webcam from 'react-webcam';

// Welcome Component: Displays a welcome message for 10 seconds before navigating to Dashboard.
function Welcome() {
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const timer = setTimeout(() => {
            navigate('/dashboard', { state: location.state });
            localStorage.removeItem('voterData'); // Clear localStorage
        }, 10000); // 10 seconds
        return () => clearTimeout(timer);
    }, [location, navigate]);

    return (
        <div className="container h-100 d-flex justify-content-center align-items-center">
            <div className="jumbotron">
                <h1 className="display-4 text-center text-dark">Welcome for Voting!</h1>
            </div>
        </div>
    );
}

// Dashboard Component: Displays voter details and party voting interface.
function Dashboard() {
    const location = useLocation();
    const navigate = useNavigate();
    const dashboardRef = useRef(null); // Ref to the dashboard container

    const [selectedParty, setSelectedParty] = useState(null);
    const [voteMessage, setVoteMessage] = useState('');
    const [fullscreenError, setFullscreenError] = useState(null); // State for fullscreen error

    // Always attempt to parse voterData, then handle rendering conditionally.
    let voterData = location.state;
    if (!voterData) {
        const storedData = localStorage.getItem('voterData');
        if (storedData) {
            try {
                voterData = JSON.parse(storedData);
                console.log("Retrieved voterData from localStorage:", voterData);
            } catch (error) {
                console.error("Error parsing voterData:", error);
            }
        }
    }

    const handleVote = async () => {
        if (!selectedParty) {
            setVoteMessage('Please select a party to vote for.');
            return;
        }
        try {
            const voteResponse = await axios.post('http://localhost:5000/vote', {
                unique_id: voterData.uniqueId,
                ec_id: voterData.ecId,
                party_id: selectedParty,
            });
            if (voteResponse.data.status === "success") {
                setVoteMessage('Your vote has been recorded. Thank you!');
            } else {
                setVoteMessage('Voting failed. Please try again.');
            }
        } catch (error) {
            console.error('Vote Error:', error);
            setVoteMessage('Voting failed. Please try again.');
        }
    };

    const enterFullscreen = () => {
        const element = dashboardRef.current; // Use the ref

        if (!element) {
            console.error("Dashboard element not found for fullscreen.");
            setFullscreenError("Dashboard element not found.");
            return;
        }

        if (element.requestFullscreen) {
            element.requestFullscreen().catch(err => {
                console.error("Fullscreen request failed:", err);
                setFullscreenError(`Fullscreen request failed: ${err.message}`);
            });
        } else if (element.mozRequestFullScreen) { /* Firefox */
            element.mozRequestFullScreen();
        } else if (element.webkitRequestFullscreen) { /* Chrome, Safari and Opera */
            element.webkitRequestFullscreen();
        } else if (element.msRequestFullscreen) { /* IE/Edge */
            element.msRequestFullscreen();
        }
    };

    useEffect(() => {
        // Attempt fullscreen on mount, but handle potential errors
        enterFullscreen();

        return () => {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
        };
    }, []);

    // Conditional rendering based on voterData existence.
    if (!voterData) {
        return (
            <div className="container mt-5">
                <h2>No data found</h2>
            </div>
        );
    }

    const { uniqueId, ecId, capturedImage } = voterData;

    const parties = [
        {
            id: 1,
            name: 'Liberal_Centric_Part',
            logo: 'https://th.bing.com/th/id/OIP.dJ_UPeYBh4YoVxV9spS7cgHaE7?rs=1&pid=ImgDetMain=Liberal_Centric_Party'
        },
        {
            id: 2,
            name: 'The_Liberal_Party',
            logo: 'https://th.bing.com/th/id/OIP.2lWGZPAjW7BcI2SZ0JXdOgHaHa?rs=1&pid=ImgDetMain=The_Liberal_Party'
        },
        {
            id: 3,
            name: 'National_Liberal_party',
            logo: 'https://th.bing.com/th/id/R.7d7445ebc0b83fa4ca92f5eb87b80dae?rik=OameVzEbUXsRLA&riu=http%3a%2f%2fnationalliberal.org%2fwp-content%2fuploads%2f2023%2f07%2fNLP-SD4-All-Logo.jpg&ehk=M7YStAgFbZL2IrEN9DBYCkbDdKgyh3eSVW%2bmz3SiZu8%3d&risl=&pid=ImgRaw&r=0'
        },
    ];

    return (
        <div ref={dashboardRef}> {/* Attach the ref to the container */}
            <header className="bg-light p-3 d-flex align-items-center">
                <img
                    src={capturedImage}
                    alt="Voter"
                    style={{ width: 50, height: 50, borderRadius: '50%', marginRight: 10 }}
                />
                <div>
                    <div>Unique ID: {uniqueId}</div>
                    <div>Election Commission ID: {ecId}</div>
                </div>
            </header>
            <main className="container mt-5">
                <h2 className="text-center mb-4">Please Cast Your Vote</h2>
                {fullscreenError && (
                    <div className="alert alert-danger" role="alert">
                        {fullscreenError}
                        <button className="btn btn-primary" onClick={enterFullscreen}>
                            Click to Try Fullscreen
                        </button>
                    </div>
                )}
                <div className="d-flex justify-content-around">
                    {parties.map(party => (
                        <div
                            key={party.id}
                            className={`text-center p-3 border ${selectedParty === party.id ? 'border-primary' : ''}`}
                            style={{ cursor: 'pointer' }}
                            onClick={() => setSelectedParty(party.id)}
                        >
                            <img
                                src={party.logo}
                                alt={party.name}
                                className="img-fluid mb-2"
                                style={{ width: '100px' }}
                            />
                            <p>{party.name}</p>
                        </div>
                    ))}
                </div>
                <div className="text-center mt-4">
                    <button className="btn btn-success" onClick={handleVote}>
                        Click to Vote
                    </button>
                </div>
                {voteMessage && (
                    <div className="alert alert-info mt-3 text-center" role="alert">
                        {voteMessage}
                    </div>
                )}
            </main>
        </div>
    );
}

// Verification Component: Handles user verification with webcam capture.
function Verification() {
    const [uniqueId, setUniqueId] = useState('');
    const [ecId, setEcId] = useState('');
    const [message, setMessage] = useState('');
    const [capturedImage, setCapturedImage] = useState(null);
    const webcamRef = useRef(null);
    const navigate = useNavigate();

    const videoConstraints = {
        width: 500,
        height: 375,
        facingMode: 'user'
    };

    const dataURLtoBlob = (dataurl) => {
        const arr = dataurl.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], { type: mime });
    };

    const capture = () => {
        const imageSrc = webcamRef.current.getScreenshot();
        const imageBlob = dataURLtoBlob(imageSrc);
        setCapturedImage(imageBlob);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!capturedImage) {
            setMessage('Please capture an image.');
            return;
        }
        const formData = new FormData();
        formData.append('unique_id', uniqueId);
        formData.append('ec_id', ecId);
        formData.append('image', capturedImage, "captured_image.jpg");

        try {
            const response = await axios.post('http://localhost:5000/verify', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                },
            });
            setMessage(response.data.message);
            if (response.data.status === "success") {
                const voterData = {
                    uniqueId,
                    ecId,
                    capturedImage: URL.createObjectURL(capturedImage)
                };
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
                        <div className="mb-3 text-center">
                            <Webcam
                                audio={false}
                                height={375}
                                ref={webcamRef}
                                screenshotFormat="image/jpeg"
                                width={500}
                                videoConstraints={videoConstraints}
                            />
                            <button type="button" className="btn btn-secondary mt-2" onClick={capture}>
                                Capture Photo
                            </button>
                        </div>
                        {capturedImage && (
                            <div className="mb-3 text-center">
                                <img
                                    src={URL.createObjectURL(capturedImage)}
                                    alt="Captured"
                                    className="img-fluid rounded"
                                />
                            </div>
                        )}
                        <button type="submit" className="btn btn-primary w-100">
                            Verify Face
                        </button>
                    </form>
                    {message && (
                        <div className="alert alert-info mt-3" role="alert">
                            {message}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Main App component with routing
function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Verification />} />
                <Route path="/welcome" element={<Welcome />} />
                <Route path="/dashboard" element={<Dashboard />} />
                {/* Additional routes can be added here */}
            </Routes>
        </Router>
    );
}

export default App;