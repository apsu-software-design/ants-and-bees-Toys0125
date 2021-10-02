import {
  Insect,
  Bee,
  Ant,
  GrowerAnt,
  ThrowerAnt,
  EaterAnt,
  ScubaAnt,
  GuardAnt,
} from "./ants";

/**
 * Is abstract class for placing both bees and ants
 */
class Place {
  protected ant: Ant;
  protected guard: GuardAnt;
  protected bees: Bee[] = [];
  /**
   *
   * @param name Location name
   * @param water is location water
   * @param exit next location
   * @param entrance last location
   */
  constructor(
    readonly name: string,
    protected readonly water = false,
    private exit?: Place,
    private entrance?: Place
  ) {}

  /**
   *
   * @returns exit location. {@link Place.exit}
   */
  getExit(): Place {
    return this.exit;
  }
  /**
   *
   * @param place set entrance location. {@link Place.entrance}
   */
  setEntrance(place: Place) {
    this.entrance = place;
  }
  /**
   *
   * @returns is this water location. {@link Place.water}
   */
  isWater(): boolean {
    return this.water;
  }
  /**
   *
   * @returns {Ant,GuardAnt} returns types GuardAnt/Ant.
   */
  getAnt(): Ant {
    if (this.guard) return this.guard;
    else return this.ant;
  }
  /**
   *
   * @returns returns only Ant {@link Place.ant}
   */
  getGuardedAnt(): Ant {
    return this.ant;
  }
  /**
   * @returns Returns all Bees on place.
   */
  getBees(): Bee[] {
    return this.bees;
  }
  /**
   * Returns the closest bee with an max and min distance. Returns the first bee in that distance.
   * @param maxDistance
   * @param minDistance
   * @returns {Bee}
   */
  getClosestBee(maxDistance: number, minDistance: number = 0): Bee {
    let p: Place = this;
    for (let dist = 0; p !== undefined && dist <= maxDistance; dist++) {
      if (dist >= minDistance && p.bees.length > 0) {
        return p.bees[0];
      }
      p = p.entrance;
    }
    return undefined;
  }
  /**
   * Add an ant to this place.
   * @param ant Any Type
   * @returns {Boolean} Returns true if not already taken.
   */
  addAnt(ant: Ant): boolean {
    if (ant instanceof GuardAnt) {
      if (this.guard === undefined) {
        this.guard = ant;
        this.guard.setPlace(this);
        return true;
      }
    } else if (this.ant === undefined) {
      this.ant = ant;
      this.ant.setPlace(this);
      return true;
    }
    return false;
  }
  /**
   * Remove Ant from the place.
   */
  removeAnt(): Ant {
    if (this.guard !== undefined) {
      let guard = this.guard;
      this.guard = undefined;
      return guard;
    } else {
      let ant = this.ant;
      this.ant = undefined;
      return ant;
    }
  }
  /**
   * Add a bee to this place.
   * @param bee
   */
  addBee(bee: Bee): void {
    this.bees.push(bee);
    bee.setPlace(this);
  }
  /**
   * Remove that type of bee from place.
   * @param bee
   */
  removeBee(bee: Bee): void {
    var index = this.bees.indexOf(bee);
    if (index >= 0) {
      this.bees.splice(index, 1);
      bee.setPlace(undefined);
    }
  }
  /**
   * Remove all bees from this place.
   */
  removeAllBees(): void {
    this.bees.forEach((bee) => bee.setPlace(undefined));
    this.bees = [];
  }
  /**
   * Move bee to next location called Exit.
   * @param bee
   */
  exitBee(bee: Bee): void {
    this.removeBee(bee);
    this.exit.addBee(bee);
  }
  /**
   * Remove either {Bee} or {Ant} from location.
   * @param insect
   */
  removeInsect(insect: Insect) {
    if (insect instanceof Ant) {
      this.removeAnt();
    } else if (insect instanceof Bee) {
      this.removeBee(insect);
    }
  }
  /**
   * Test if in water and ant can not survive water.
   */
  act() {
    if (this.water) {
      if (this.guard) {
        this.removeAnt();
      }
      if (!(this.ant instanceof ScubaAnt)) {
        this.removeAnt();
      }
    }
  }
}

class Hive extends Place {
  private waves: { [index: number]: Bee[] } = {};
  /**
   *
   * @param beeArmor set armor
   * @param beeDamage set damage
   */
  constructor(private beeArmor: number, private beeDamage: number) {
    super("Hive");
  }
  /**
   *
   * @param attackTurn current wave
   * @param numBees Amount of bees for current wave
   * @returns {Hive}
   */
  addWave(attackTurn: number, numBees: number): Hive {
    let wave: Bee[] = [];
    for (let i = 0; i < numBees; i++) {
      let bee = new Bee(this.beeArmor, this.beeDamage, this);
      this.addBee(bee);
      wave.push(bee);
    }
    this.waves[attackTurn] = wave;
    return this;
  }
  /**
   * Return current wave of bees.
   * @param colony
   * @param currentTurn current round in the game
   * @returns {Bee}
   */
  invade(colony: AntColony, currentTurn: number): Bee[] {
    if (this.waves[currentTurn] !== undefined) {
      this.waves[currentTurn].forEach((bee) => {
        this.removeBee(bee);
        let entrances: Place[] = colony.getEntrances();
        let randEntrance: number = Math.floor(Math.random() * entrances.length);
        entrances[randEntrance].addBee(bee);
      });
      return this.waves[currentTurn];
    } else {
      return [];
    }
  }
}

class AntColony {
  /**
   * Current amount of food available.
   */
  private food: number;
  /**
   * Row and cols. Of tunnels.
   */
  private places: Place[][] = [];
  /**
   * Row where bees can spawn.
   */
  private beeEntrances: Place[] = [];
  /**
   * Tunnel where queen is.
   */
  private queenPlace: Place = new Place("Ant Queen");
  /**
   * Boost types and number of boost left.
   */
  private boosts: { [index: string]: number } = {
    FlyingLeaf: 1,
    StickyLeaf: 1,
    IcyLeaf: 1,
    BugSpray: 0,
  };
  /**
   *
   * @param startingFood Starting food amount for the game.
   * @param numTunnels number of rows.
   * @param tunnelLength How long each cols.
   * @param moatFrequency How likely water to spawn in the tunnel.
   */
  constructor(
    startingFood: number,
    numTunnels: number,
    tunnelLength: number,
    moatFrequency = 0
  ) {
    this.food = startingFood;

    let prev: Place;
    for (let tunnel = 0; tunnel < numTunnels; tunnel++) {
      let curr: Place = this.queenPlace;
      this.places[tunnel] = [];
      for (let step = 0; step < tunnelLength; step++) {
        let typeName = "tunnel";
        if (moatFrequency !== 0 && (step + 1) % moatFrequency === 0) {
          typeName = "water";
        }

        prev = curr;
        let locationId: string = tunnel + "," + step;
        curr = new Place(
          typeName + "[" + locationId + "]",
          typeName == "water",
          prev
        );
        prev.setEntrance(curr);
        this.places[tunnel][step] = curr;
      }
      this.beeEntrances.push(curr);
    }
  }
  /**
   *
   * @returns {@link AntColony.food}
   */
  getFood(): number {
    return this.food;
  }
  /**
   *
   * @param amount Amount of food to add. {@link AntColony.food}
   */
  increaseFood(amount: number): void {
    this.food += amount;
  }
  /**
   *
   * @returns All available places.
   */
  getPlaces(): Place[][] {
    return this.places;
  }
  /**
   *
   * @returns Returns all bee entrances. {@link AntColony.beeEntrances}
   */
  getEntrances(): Place[] {
    return this.beeEntrances;
  }
  /**
   *
   * @returns Gets current queen location. {@link AntColony.queenPlace}
   */
  getQueenPlace(): Place {
    return this.queenPlace;
  }
  /**
   * Checks if bees are present of the location of the queen.
   * @returns True if bees are present.
   */
  queenHasBees(): boolean {
    return this.queenPlace.getBees().length > 0;
  }
  /**
   * Gives the current boosts of the any colony that can be used.
   * @returns {@link AntColony.boosts}
   */
  getBoosts(): { [index: string]: number } {
    return this.boosts;
  }
  /**
   *
   * @param boost Use boosts type {@link AntColony.boosts}
   */
  addBoost(boost: string) {
    if (this.boosts[boost] === undefined) {
      this.boosts[boost] = 0;
    }
    this.boosts[boost] = this.boosts[boost] + 1;
    console.log("Found a " + boost + "!");
  }
  /**
   * Checks if Ant is present and has enough food to get the ant.
   * @param ant Deploy Ant
   * @param place
   * @returns "undefined" success or "tunnel already occupied"/"not enough food"
   * @throws "tunnel already occupied"
   * @throws "not enough food"
   */
  deployAnt(ant: Ant, place: Place): string {
    if (this.food >= ant.getFoodCost()) {
      let success = place.addAnt(ant);
      if (success) {
        this.food -= ant.getFoodCost();
        return undefined;
      }
      return "tunnel already occupied";
    }
    return "not enough food";
  }
  /**
   * Remove ant from location.
   * @param place
   */
  removeAnt(place: Place) {
    place.removeAnt();
  }
  /**
   *
   * @param boost {@link AntColony.boosts}
   * @param place location to apply to.
   * @returns "undefined" for success or "no such boost"/"no Ant at location"
   * @throws "no such boost" or "no Ant at location"
   */
  applyBoost(boost: string, place: Place): string {
    if (this.boosts[boost] === undefined || this.boosts[boost] < 1) {
      return "no such boost";
    }
    let ant: Ant = place.getAnt();
    if (!ant) {
      return "no Ant at location";
    }
    ant.setBoost(boost);
    return undefined;
  }
  /**
   * Run act on all ants in colony.
   */
  antsAct() {
    this.getAllAnts().forEach((ant) => {
      if (ant instanceof GuardAnt) {
        let guarded = ant.getGuarded();
        if (guarded) guarded.act(this);
      }
      ant.act(this);
    });
  }
  /**
   * Run act on all bees.
   */
  beesAct() {
    this.getAllBees().forEach((bee) => {
      bee.act();
    });
  }
  /**
   * Run act on all places.
   */
  placesAct() {
    for (let i = 0; i < this.places.length; i++) {
      for (let j = 0; j < this.places[i].length; j++) {
        this.places[i][j].act();
      }
    }
  }
  /**
   * Gets all ants in colony.
   * @returns
   */
  getAllAnts(): Ant[] {
    let ants = [];
    for (let i = 0; i < this.places.length; i++) {
      for (let j = 0; j < this.places[i].length; j++) {
        if (this.places[i][j].getAnt() !== undefined) {
          ants.push(this.places[i][j].getAnt());
        }
      }
    }
    return ants;
  }
  /**
   * Gets all bees.
   * @returns
   */
  getAllBees(): Bee[] {
    var bees = [];
    for (var i = 0; i < this.places.length; i++) {
      for (var j = 0; j < this.places[i].length; j++) {
        bees = bees.concat(this.places[i][j].getBees());
      }
    }
    return bees;
  }
}

class AntGame {
  /**
   * Current turn number
   */
  private turn: number = 0;
  /**
   *
   * @param colony The ant colony that you using.
   * @param hive The hive that you using.
   */
  constructor(private colony: AntColony, private hive: Hive) {}
  /**
   * Run your current turn in the game.
   */
  takeTurn() {
    console.log("");
    this.colony.antsAct();
    this.colony.beesAct();
    this.colony.placesAct();
    this.hive.invade(this.colony, this.turn);
    this.turn++;
    console.log("");
  }
  /**
   *
   * @returns {@link AntGame.turn}
   */
  getTurn() {
    return this.turn;
  }
  /**
   *
   * @returns True is a win, False is a lose, and undefined means still going.
   */
  gameIsWon(): boolean | undefined {
    if (this.colony.queenHasBees()) {
      return false;
    } else if (
      this.colony.getAllBees().length + this.hive.getBees().length ===
      0
    ) {
      return true;
    }
    return undefined;
  }
  /**
   *
   * @param antType ["grower","thrower","eater","scuba","guard"]
   * @param placeCoordinates rows,cols
   * @returns "undefined"-success or {@link AntColony.deployAnt} throws.
   * @throws "Unknown ant type" on wrong input.
   * @throws "illegal location" on wrong input location.
   */
  deployAnt(antType: string, placeCoordinates: string): string {
    let ant;
    switch (antType.toLowerCase()) {
      case "grower":
        ant = new GrowerAnt();
        break;
      case "thrower":
        ant = new ThrowerAnt();
        break;
      case "eater":
        ant = new EaterAnt();
        break;
      case "scuba":
        ant = new ScubaAnt();
        break;
      case "guard":
        ant = new GuardAnt();
        break;
      default:
        return "unknown ant type";
    }

    try {
      let coords = placeCoordinates.split(",");
      let place: Place = this.colony.getPlaces()[coords[0]][coords[1]];
      return this.colony.deployAnt(ant, place);
    } catch (e) {
      return "illegal location";
    }
  }
  /**
   *
   * @param placeCoordinates
   * @returns "undefined"
   * @throws "illegal location"
   */
  removeAnt(placeCoordinates: string): string {
    try {
      let coords = placeCoordinates.split(",");
      let place: Place = this.colony.getPlaces()[coords[0]][coords[1]];
      place.removeAnt();
      return undefined;
    } catch (e) {
      return "illegal location";
    }
  }
  /**
   *
   * @param boostType {@link AntColony.boosts}
   * @param placeCoordinates rows,cols
   * @returns "undefined" or {@link AntColony.applyBoost} throws
   */
  boostAnt(boostType: string, placeCoordinates: string): string {
    try {
      let coords = placeCoordinates.split(",");
      let place: Place = this.colony.getPlaces()[coords[0]][coords[1]];
      return this.colony.applyBoost(boostType, place);
    } catch (e) {
      return "illegal location";
    }
  }
  /**
   * Get all places in colony. {@link AntColony.getPlaces}
   * @returns
   */
  getPlaces(): Place[][] {
    return this.colony.getPlaces();
  }
  /**
   * Get current food. {@link AntColony.getFood}
   * @returns
   */
  getFood(): number {
    return this.colony.getFood();
  }
  /**
   * Get amount of bees. {@link Hive.getBees}
   * @returns 
   */
  getHiveBeesCount(): number {
    return this.hive.getBees().length;
  }
  /**
   * Get current available boost names. {@link AntColony.boosts}
   * @returns 
   */
  getBoostNames(): string[] {
    let boosts = this.colony.getBoosts();
    return Object.keys(boosts).filter((boost: string) => {
      return boosts[boost] > 0;
    });
  }
}

export { AntGame, Place, Hive, AntColony };
