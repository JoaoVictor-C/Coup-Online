import React from 'react';
import { Link } from 'react-router-dom';
import coupLogo from '../assets/images/coup-logo.png';
import assassin from '../assets/images/cards/assassin.png';
import captain from '../assets/images/cards/captain.png';
import contessa from '../assets/images/cards/contessa.png';
import duke from '../assets/images/cards/duke.png';
import ambassador from '../assets/images/cards/ambassador.png';

const characterCards = [
  { name: 'Assassin', image: assassin },
  { name: 'Captain', image: captain },
  { name: 'Contessa', image: contessa },
  { name: 'Duke', image: duke },
  { name: 'Ambassador', image: ambassador },
];

const Home = () => (
  <div className="container-fluid py-5 bg-light">
    <div className="row justify-content-center">
      <div className="col-lg-10">
        <div className="text-center mb-5">
          <img src={coupLogo} alt="COUP Online Logo" className="img-fluid mb-4" style={{maxWidth: '300px'}} />
          <h1 className="display-4 mb-3">Welcome to COUP Online</h1>
          <p className="lead">Master the art of deception, read your opponents, and strategize your way to victory!</p>
        </div>
        
        <div className="row">
          <div className="col-md-6 mb-4">
            <div className="card shadow h-100">
              <div className="card-body">
                <h2 className="card-title h4 mb-4">About the Game</h2>
                <p className="card-text">
                  COUP is a strategic card game of bluffing, deduction, and manipulation. Players vie for power by taking actions, 
                  challenging opponents, and outmaneuvering rivals to eliminate their influences and emerge victorious.
                </p>
                <div className="d-flex flex-wrap justify-content-center">
                  {characterCards.map((card, index) => (
                    <img key={index} src={card.image} alt={`${card.name} Card`} className="img-fluid rounded m-2" style={{width: '80px'}} />
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          <div className="col-md-6 mb-4">
            <div className="card shadow h-100">
              <div className="card-body">
                <h2 className="card-title h4 mb-4">How to Play</h2>
                <ul className="list-group list-group-flush mb-4">
                  <li className="list-group-item">Each player starts with 2 coins and 2 random character cards.</li>
                  <li className="list-group-item">On your turn, choose one action (e.g., Income, Foreign Aid, Coup).</li>
                  <li className="list-group-item">Other players can challenge or block your action.</li>
                  <li className="list-group-item">Lose all your influences, and you&apos;re eliminated from the game.</li>
                  <li className="list-group-item">The last player with influence wins!</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        
        <div className="text-center mt-5">
          <Link to="/login" className="btn btn-primary btn-lg mx-2 mb-2">Login</Link>
          <Link to="/register" className="btn btn-outline-primary btn-lg mx-2 mb-2">Register</Link>
        </div>
      </div>
    </div>
  </div>
);

export default Home;