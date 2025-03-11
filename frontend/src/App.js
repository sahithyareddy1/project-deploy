import React, { useState, useRef, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import Webcam from 'react-webcam';
import 'bootstrap/dist/css/bootstrap.min.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faTimesCircle } from '@fortawesome/free-solid-svg-icons';

// Verification Component: Handles user verification with webcam capture.
function Verification() {
    const [uniqueId, setUniqueId] = useState('');
    const [ecId, setEcId] = useState('');
    const [message, setMessage] = useState('');
    const [capturedImage, setCapturedImage] = useState(null);
    const [capturedImageUrl, setCapturedImageUrl] = useState(null);
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
        setCapturedImageUrl(imageSrc); // Store the base64 image for display
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
            setMessage('Verifying...');
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
                    capturedImage: capturedImageUrl // Store the base64 string directly
                };
                localStorage.setItem('voterData', JSON.stringify(voterData));
                navigate('/welcome', { state: voterData });
            }
        } catch (error) {
            if (error.response) {
                console.error('Backend error:', error.response.data);
                setMessage(error.response.data.message || 'Face verification failed');
            } else {
                console.error('Error:', error.message);
                setMessage('Face verification failed');
            }
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
                        {capturedImageUrl && (
                            <div className="mb-3 text-center">
                                <img
                                    src={capturedImageUrl}
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
                        <div className={`alert ${message.includes('verified') ? 'alert-success' : 'alert-info'} mt-3`} role="alert">
                            {message}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Welcome Component: Displays a welcome message for 10 seconds before navigating to Dashboard.
function Welcome() {
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const timer = setTimeout(() => {
            navigate('/dashboard', { state: location.state });
            // Don't remove localStorage here
        }, 10000); // 10 seconds
        return () => clearTimeout(timer);
    }, [location, navigate]);

    return (
        <div className="container h-100 d-flex justify-content-center align-items-center">
            <div className="jumbotron text-center my-5">
                <h1 className="display-4 text-center text-dark">Welcome for Voting!</h1>
                <p className="lead">Please wait, you will be redirected to the voting page shortly...</p>
                <div className="spinner-border text-primary mt-3" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-3">
                    <small>Redirecting in 10 seconds...</small>
                </p>
            </div>
        </div>
    );
}

// Dashboard Component: Displays voter details and party voting interface.
function Dashboard() {
    const location = useLocation();
    const navigate = useNavigate();
    const dashboardRef = useRef(null);
    const [voteMessage, setVoteMessage] = useState('');
    const [votingStatus, setVotingStatus] = useState('ready'); // 'ready', 'voting', 'voted'
    const [fullscreenError, setFullscreenError] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Retrieve voter data
    let voterData = location.state;
    if (!voterData) {
        const storedData = localStorage.getItem('voterData');
        if (storedData) {
            try {
                voterData = JSON.parse(storedData);
            } catch (error) {
                console.error("Error parsing voterData:", error);
            }
        }
    }

    // Listen for fullscreen changes
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(document.fullscreenElement !== null);
            // Clear error if fullscreen is successful
            if (document.fullscreenElement !== null) {
                setFullscreenError(null);
            }
        };
        document.addEventListener("fullscreenchange", handleFullscreenChange);
        handleFullscreenChange();
        return () => {
            document.removeEventListener("fullscreenchange", handleFullscreenChange);
        };
    }, []);

    // Request fullscreen when component mounts
    useEffect(() => {
        const requestFullscreenMode = () => {
            const element = dashboardRef.current;
            if (element && element.requestFullscreen) {
                element.requestFullscreen().catch(err => {
                    console.error("Fullscreen request failed:", err);
                    setFullscreenError(`Fullscreen request failed: ${err.message}`);
                });
            }
        };

        // Try to request fullscreen after a small delay
        const timer = setTimeout(() => {
            requestFullscreenMode();
        }, 1000);

        return () => {
            clearTimeout(timer);
            // Exit fullscreen when component unmounts
            if (document.fullscreenElement) {
                document.exitFullscreen().catch((err) => {
                    console.error("Error while exiting fullscreen:", err);
                });
            }
        };
    }, []);

    const handleVote = async (partyId) => {
        if (!voterData) {
            setVoteMessage('Voter data is missing. Please return to the verification page.');
            return;
        }

        // Set voting in progress
        setVotingStatus('voting');
        setVoteMessage('Submitting your vote...');
        
        try {
            const voteResponse = await axios.post('http://localhost:5000/vote', {
                unique_id: voterData.uniqueId,
                ec_id: voterData.ecId,
                party_id: partyId,
            });
            
            if (voteResponse.data.status === "success") {
                setVotingStatus('voted');
                setVoteMessage('Your vote has been recorded. Thank you!');
                // Clear localStorage only after successful voting
                localStorage.removeItem('voterData');
                
                // Redirect to a thank you page after a delay
                setTimeout(() => {
                    // Exit fullscreen before navigating
                    if (document.fullscreenElement) {
                        document.exitFullscreen().catch((err) => {
                            console.error("Error while exiting fullscreen:", err);
                        });
                    }
                    navigate('/thank-you');
                }, 3000);
            } else {
                setVotingStatus('ready');
                setVoteMessage(voteResponse.data.message || 'Voting failed. Please try again.');
            }
        } catch (error) {
            console.error('Vote Error:', error);
            setVotingStatus('ready');
            if (error.response && error.response.data && error.response.data.message) {
                setVoteMessage(error.response.data.message);
            } else {
                setVoteMessage('Voting failed. Please try again.');
            }
        }
    };

    // If no voter data is found, show a message
    if (!voterData) {
        return (
            <div className="container mt-5 text-center">
                <h2>No voter data found</h2>
                <p>Please return to the verification page.</p>
                <button 
                    className="btn btn-primary mt-3" 
                    onClick={() => navigate('/')}
                >
                    Go to Verification
                </button>
            </div>
        );
    }

    const { uniqueId, ecId, capturedImage } = voterData;

    // Party data
    const parties = [
        {
            id: 1,
            name: 'Liberal Centric Party',
            logo: 'https://th.bing.com/th/id/OIP.dJ_UPeYBh4YoVxV9spS7cgHaE7?rs=1&pid=ImgDetMain'
        },
        {
            id: 2,
            name: 'The Liberal Party',
            logo: 'https://th.bing.com/th/id/OIP.2lWGZPAjW7BcI2SZ0JXdOgHaHa?rs=1&pid=ImgDetMain'
        },
        {
            id: 3,
            name: 'National Liberal Party',
            logo: 'https://th.bing.com/th/id/R.7d7445ebc0b83fa4ca92f5eb87b80dae?rik=OameVzEbUXsRLA&riu=http%3a%2f%2fnationalliberal.org%2fwp-content%2fuploads%2f2023%2f07%2fNLP-SD4-All-Logo.jpg&ehk=M7YStAgFbZL2IrEN9DBYCkbDdKgyh3eSVW%2bmz3SiZu8%3d&risl=&pid=ImgRaw&r=0'
        },
        {
            id: 4,
            name : 'Indian-National-Congress',
            logo: 'https://www.designerpeople.com/wp-content/uploads/2018/08/Free-Vector-EPS-Logo-Download-Indian-National-Congress-INC.jpg'
        },
        {
            id: 5,
            name: 'Bharatiya-Janata-Party',
            logo: 'https://www.designerpeople.com/wp-content/uploads/2018/08/Free-Vector-EPS-Logo-Download-Bharatiya-Janata-Party-BJP.jpg'
        } 
    ];

    return (
        <div ref={dashboardRef} className="min-vh-100">
            <header className="bg-light p-3 d-flex align-items-center">
                <img
                    src={capturedImage}
                    alt="Voter"
                    style={{ width: 50, height: 50, borderRadius: '50%', marginRight: 10 }}
                    onError={(e) => {
                        console.error("Error loading image");
                        e.target.src = "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2250%22%20height%3D%2250%22%20viewBox%3D%220%200%2050%2050%22%3E%3Ccircle%20cx%3D%2225%22%20cy%3D%2225%22%20r%3D%2225%22%20fill%3D%22%23ccc%22%2F%3E%3C%2Fsvg%3E";
                    }}
                />
                <div>
                    <div>Unique ID: {uniqueId}</div>
                    <div>Election Commission ID: {ecId}</div>
                </div>
            </header>
            <main className="container mt-5">
                <h2 className="text-center mb-4">Please Cast Your Vote</h2>
                
                {fullscreenError && (
                    <div className="alert alert-warning" role="alert">
                        <p>{fullscreenError}</p>
                        <p>Fullscreen mode is recommended for secure voting.</p>
                        <button 
                            className="btn btn-primary" 
                            onClick={() => {
                                dashboardRef.current.requestFullscreen().catch(err => {
                                    console.error("Fullscreen request failed:", err);
                                    setFullscreenError(`Fullscreen request failed: ${err.message}. You can still vote.`);
                                });
                            }}
                        >
                            Click to Enable Fullscreen
                        </button>
                    </div>
                )}
                
                {votingStatus !== 'voted' ? (
                    <div className="row justify-content-center">
                        {parties.map(party => (
                            <div
                                key={party.id}
                                className="col-md-3 text-center p-4 m-3 border rounded shadow"
                            >
                                <img
                                    src={party.logo}
                                    alt={party.name}
                                    className="img-fluid mb-3"
                                    style={{ width: '120px', height: '120px', objectFit: 'contain' }}
                                    onError={(e) => {
                                        console.error(`Error loading party logo for ${party.name}`);
                                        e.target.src = "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22100%22%20height%3D%22100%22%20viewBox%3D%220%200%20100%20100%22%3E%3Crect%20width%3D%22100%22%20height%3D%22100%22%20fill%3D%22%23eee%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20text-anchor%3D%22middle%22%20alignment-baseline%3D%22middle%22%20font-family%3D%22Arial%2C%20sans-serif%22%20font-size%3D%2220%22%20fill%3D%22%23999%22%3E%3Ctspan%20x%3D%2250%25%22%20dy%3D%220%22%3ELogo%3C%2Ftspan%3E%3Ctspan%20x%3D%2250%25%22%20dy%3D%2225%22%3ENot%3C%2Ftspan%3E%3Ctspan%20x%3D%2250%25%22%20dy%3D%2225%22%3EAvailable%3C%2Ftspan%3E%3C%2Ftext%3E%3C%2Fsvg%3E";
                                    }}
                                />
                                <p className="fw-bold">{party.name}</p>
                                <button 
                                    className="btn btn-success w-100 mt-2"
                                    onClick={() => handleVote(party.id)}
                                    disabled={votingStatus === 'voting'}
                                >
                                    Vote for this party
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center mt-4">
                        <div className="display-1 text-success mb-3">
                            <i className="bi bi-check-circle-fill"></i>
                        </div>
                        <h3>Vote Successful!</h3>
                        <p>Redirecting to confirmation page...</p>
                    </div>
                )}
                
                {voteMessage && (
                    <div className={`alert ${voteMessage.includes('recorded') ? 'alert-success' : 'alert-info'} mt-3 text-center`} role="alert">
                        {voteMessage}
                    </div>
                )}
            </main>
        </div>
    );
}

// Thank You Component
function ThankYou() {
    return (
        <div className="container mt-5 text-center">
            <div className="card shadow p-5">
                <div className="display-1 text-success mb-3">
                    <i className="bi bi-check-circle-fill"></i>
                </div>
                <h1 className="display-4">Thank You for Voting!</h1>
                <p className="lead">Your vote has been recorded successfully in our secure system.</p>
                <p>Your participation contributes to the democratic process.</p>
                <div className="mt-4">
                    <button className="btn btn-primary" onClick={() => window.location.href = '/'}>
                        Exit System
                    </button>
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
                <Route path="/thank-you" element={<ThankYou />} />
            </Routes>
        </Router>
    );
}

export default App;