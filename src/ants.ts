import { AntColony, Place } from "./game";

export abstract class Insect {
  readonly name: string;
  /**
   *
   * @param armor Armor of insect
   * @param place Starting location.
   */
  constructor(protected armor: number, protected place: Place) {}
  /**
   *
   * @returns {@link Insect.name}
   */
  getName(): string {
    return this.name;
  }
  /**
   *
   * @returns {@link Insect.armor}
   */
  getArmor(): number {
    return this.armor;
  }
  /**
   * 
   * @returns {@link Insect.place}
   */
  getPlace() {
    return this.place;
  }
  /**
   * Set location of insect.
   * @param place 
   */
  setPlace(place: Place) {
    this.place = place;
  }
/**
 * Reduce armor of insect and remove insect once ran out.
 * @param amount 
 * @returns True on death otherwise false.
 * @emits Ant "ran out of armor and expired."
 */
  reduceArmor(amount: number): boolean {
    this.armor -= amount;
    if (this.armor <= 0) {
      console.log(this.toString() + " ran out of armor and expired");
      this.place.removeInsect(this);
      return true;
    }
    return false;
  }

  abstract act(colony?: AntColony): void;
/**
 * Prints name and current location of insect.
 * @returns Example "Grower(0,0)"
 */
  toString(): string {
    return this.name + "(" + (this.place ? this.place.name : "") + ")";
  }
}

export class Bee extends Insect {
  readonly name: string = "Bee";
  /**
   * Status type ["cold","stuck"]
   */
  private status: string;
/**
 * 
 * @param armor starting armor of Bee
 * @param damage amount of damage bee does.
 * @param place Starting location of bee.
 */
  constructor(armor: number, private damage: number, place?: Place) {
    super(armor, place);
  }
/**
 * 
 * @param ant Ant to sting
 * @returns {@link Ant.reduceArmor}
 */
  sting(ant: Ant): boolean {
    console.log(this + " stings " + ant + "!");
    return ant.reduceArmor(this.damage);
  }
/**
 * Checks if ant is present at location.
 * @returns True if ant is present otherwise false.
 */
  isBlocked(): boolean {
    return this.place.getAnt() !== undefined;
  }
/**
 * 
 * @param status Set status of bee. {@link Bee.status}
 */
  setStatus(status: string) {
    this.status = status;
  }
/**
 * Action checking if either cold or stuck and resetting status back to undefined.
 */
  act() {
    /**
     * Check if bee is blocked and or stuck.
     */
    if (this.isBlocked()) {
      if (this.status !== "cold") {
        this.sting(this.place.getAnt());
      }
    } else if (this.armor > 0) {
      if (this.status !== "stuck") {
        this.place.exitBee(this);
      }
    }
    this.status = undefined;
  }
}

export abstract class Ant extends Insect {
  /**
   * Given boost {@link AntColony.boosts}
   */
  protected boost: string;
  /**
   * 
   * @param armor starting armor.
   * @param foodCost cost of ant.
   * @param place starting location of ant.
   */
  constructor(armor: number, private foodCost: number = 0, place?: Place) {
    super(armor, place);
  }
/**
 * 
 * @returns {@link Ant.foodCost}
 */
  getFoodCost(): number {
    return this.foodCost;
  }
  /**
   * Sets boost for Ant.
   * @param boost {@link Ant.boost}
   */
  setBoost(boost: string) {
    this.boost = boost;
    console.log(this.toString() + " is given a " + boost);
  }
}

export class GrowerAnt extends Ant {
  readonly name: string = "Grower";
  /**
   * Sets {@link Ant.armour} to 1 and {@link Ant.foodCost} to 1.
   */
  constructor() {
    super(1, 1);
  }
/**
 * Random chance of getting 1 food or 1 boost. {@link AntColony.food}/{@link AntColony.boosts}
 * @param colony current colony.
 */
  act(colony: AntColony) {
    let roll = Math.random();
    if (roll < 0.6) {
      colony.increaseFood(1);
    } else if (roll < 0.7) {
      colony.addBoost("FlyingLeaf");
    } else if (roll < 0.8) {
      colony.addBoost("StickyLeaf");
    } else if (roll < 0.9) {
      colony.addBoost("IcyLeaf");
    } else if (roll < 0.95) {
      colony.addBoost("BugSpray");
    }
  }
}

export class ThrowerAnt extends Ant {
  readonly name: string = "Thrower";
  /**
   * Amount of damage thrower does
   */
  private damage: number = 1;
/**
 * Sets {@link Ant.armour} to 1 and {@link Ant.foodCost} to 4.
 */
  constructor() {
    super(1, 4);
  }
/**
 * Can use bug repellant to kill all bees but doing so also destroys the thrower.
 * Using flying leaf targets a father bee.
 * Using Stickyleaf gives target stuck status.
 * Using Icyleaf give target cold status.
 */
  act() {
    if (this.boost !== "BugSpray") {
      let target;
      if (this.boost === "FlyingLeaf") target = this.place.getClosestBee(5);
      else target = this.place.getClosestBee(3);

      if (target) {
        console.log(this + " throws a leaf at " + target);
        target.reduceArmor(this.damage);

        if (this.boost === "StickyLeaf") {
          target.setStatus("stuck");
          console.log(target + " is stuck!");
        }
        if (this.boost === "IcyLeaf") {
          target.setStatus("cold");
          console.log(target + " is cold!");
        }
        this.boost = undefined;
      }
    } else {
      console.log(this + " sprays bug repellant everywhere!");
      let target = this.place.getClosestBee(0);
      while (target) {
        target.reduceArmor(10);
        target = this.place.getClosestBee(0);
      }
      this.reduceArmor(10);
    }
  }
}

export class EaterAnt extends Ant {
  readonly name: string = "Eater";
  /**
   * How many turns eating bees.
   */
  private turnsEating: number = 0;
  /**
   * Makes a place type stomach to place bees in.
   */
  private stomach: Place = new Place("stomach");
  /**
   * Sets {@link Ant.armour} to 2 and {@link Ant.foodCost} to 4.
   */
  constructor() {
    super(2, 4);
  }
/**
 * Checks if bees are in the stomach. {@link EaterAnt.stomach}
 * @returns True on full, false when empty.
 */
  isFull(): boolean {
    return this.stomach.getBees().length > 0;
  }
/**
 * Spends 4 turns eating and removes a bee out of stomach.
 * When empty eats all bees in front of it.
 */
  act() {
    console.log("eating: " + this.turnsEating);
    if (this.turnsEating == 0) {
      console.log("try to eat");
      let target = this.place.getClosestBee(0);
      if (target) {
        console.log(this + " eats " + target + "!");
        this.place.removeBee(target);
        this.stomach.addBee(target);
        this.turnsEating = 1;
      }
    } else {
      if (this.turnsEating > 3) {
        this.stomach.removeBee(this.stomach.getBees()[0]);
        this.turnsEating = 0;
      } else this.turnsEating++;
    }
  }
/**
 * When hit and only having one turn to eat coughs up the bee and sets turn to eating to 3.
 * When armor less than 0 and been less than 3 eating turns coughs up 1 bee.
 * @param amount amount of damage.
 * @returns {@link Ant.reduceArmor} or false when nothing happens.
 */
  reduceArmor(amount: number): boolean {
    this.armor -= amount;
    console.log("armor reduced to: " + this.armor);
    if (this.armor > 0) {
      if (this.turnsEating == 1) {
        let eaten = this.stomach.getBees()[0];
        this.stomach.removeBee(eaten);
        this.place.addBee(eaten);
        console.log(this + " coughs up " + eaten + "!");
        this.turnsEating = 3;
      }
    } else if (this.armor <= 0) {
      if (this.turnsEating > 0 && this.turnsEating <= 2) {
        let eaten = this.stomach.getBees()[0];
        this.stomach.removeBee(eaten);
        this.place.addBee(eaten);
        console.log(this + " coughs up " + eaten + "!");
      }
      return super.reduceArmor(amount);
    }
    return false;
  }
}

export class ScubaAnt extends Ant {
  readonly name: string = "Scuba";
  private damage: number = 1;
/**
 * Sets {@link Ant.armour} to 1 and {@link Ant.foodCost} to 5.
 */
  constructor() {
    super(1, 5);
  }
/**
 * Can use bug repellant to kill all bees but doing so also destroys the thrower.
 * Using flying leaf targets a father bee.
 * Using Stickyleaf gives target stuck status.
 * Using Icyleaf give target cold status.
 */
  act() {
    if (this.boost !== "BugSpray") {
      let target;
      if (this.boost === "FlyingLeaf") target = this.place.getClosestBee(5);
      else target = this.place.getClosestBee(3);

      if (target) {
        console.log(this + " throws a leaf at " + target);
        target.reduceArmor(this.damage);

        if (this.boost === "StickyLeaf") {
          target.setStatus("stuck");
          console.log(target + " is stuck!");
        }
        if (this.boost === "IcyLeaf") {
          target.setStatus("cold");
          console.log(target + " is cold!");
        }
        this.boost = undefined;
      }
    } else {
      console.log(this + " sprays bug repellant everywhere!");
      let target = this.place.getClosestBee(0);
      while (target) {
        target.reduceArmor(10);
        target = this.place.getClosestBee(0);
      }
      this.reduceArmor(10);
    }
  }
}

/**
 * Only Ant that can occupy the same space as other ants.
 */
export class GuardAnt extends Ant {
  readonly name: string = "Guard";
/**
 * Sets {@link Ant.armour} to 2 and {@link Ant.foodCost} to 4.
 */
  constructor() {
    super(2, 4);
  }
/**
 * 
 * @returns {@link Place.getGuardedAnt}
 */
  getGuarded(): Ant {
    return this.place.getGuardedAnt();
  }
/**
 * Blank...
 */
  act() {}
}
