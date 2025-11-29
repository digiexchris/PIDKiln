Feature: Simulator Mode
  As a developer testing the frontend
  I want to know when I'm connected to a simulator
  So I can test time-accelerated scenarios

  Background:
    Given I am viewing the frontend
    And I am connected to the simulator

  Scenario: Simulator indicator is visible
    Then I should see a "SIMULATED" badge in the status bar
    And I should see a time scale slider

  Scenario: Time scale slider shows current value
    Given the simulator is running at 1x speed
    Then the time scale label should show "1.0x"

  Scenario: Adjust time scale via slider
    When I move the time scale slider to 10
    Then the time scale label should show "10.0x"
    And the simulator should receive a SetTimeScaleCommand with value 10.0

  Scenario: Time scale persists across page reloads
    Given the simulator is running at 5x speed
    When I reload the page
    Then the time scale slider should show 5
    And the time scale label should show "5.0x"

  Scenario: Simulator indicator hidden when connected to real device
    Given I am connected to a real ESP32 device
    Then I should not see the "SIMULATED" badge
    And I should not see the time scale slider

  Scenario: Chart uses simulated time for Now marker
    Given the simulator is running at 10x speed
    And the simulated time is 1 hour ahead of real time
    Then the "Now" marker on the chart should be at the simulated time
    And the chart data should align with simulated timestamps

  Scenario: Time acceleration affects program execution
    Given a program is loaded
    And the simulator is running at 25x speed
    When I start the program
    Then the program should progress 25 times faster than real time
    And the chart should update with accelerated data points

